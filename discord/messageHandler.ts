import { MessageEmbed, Message, TextChannel } from 'discord.js'
import { createUserInteractionState } from './models'
import { getRandomSoundByte, getSoundByteThatMatches } from '../get-yarn/simpleSearchHandler'
import * as NEL from 'fp-ts/lib/NonEmptyArray'
import * as Arr from 'fp-ts/lib/Array'
import * as Opt from 'fp-ts/lib/Option'
import { SoundByte } from '../get-yarn/models'
import { pipe } from 'fp-ts/lib/pipeable'
import * as T from 'fp-ts/lib/Task'
import * as TE from 'fp-ts/lib/TaskEither'
import * as E from 'fp-ts/lib/Either'
import { foldEitherErrorOrSoundByte, joinTokens } from '../fp-utils'
import UserInteractionMap from './UserInteractionMap'
import { createEmbeddedMessage, sendDiscordMessage } from './discordUtils'

const botPrefix = '\/'
const userStateMap = new UserInteractionMap()

interface TransformedMessages {
    embeddedMessages: NEL.NonEmptyArray<MessageEmbed>,
    soundBytes: NEL.NonEmptyArray<SoundByte>
}

export const handleMessage = (message: Message) => {
    Opt.option.map(
        NEL.fromArray(message.content.split(' ')),
        tokens => {
            const command = NEL.head(tokens)
            pipe(
                Number.parseInt(command),
                parsedNumber => isNaN(parsedNumber) ? Opt.none : Opt.some(parsedNumber),
                Opt.fold(
                    handleStringCommand(message, command, NEL.fromArray(NEL.tail(tokens))),
                    handleNumberCommand(message)
                )
            )
        }
    )
}

const handleStringCommand = (message: Message, command: string, remainingTokens: Opt.Option<NEL.NonEmptyArray<string>>) => () => {
    const sendDiscordMessageToChannel = sendDiscordMessage(message.channel)
    const trimmedCommand = command.substring(command.indexOf(botPrefix) + 1)

    if (trimmedCommand === command)
        return

    switch (trimmedCommand) {
        case 'byteMe':
            T.task.chain(
                getSoundByteUrl(remainingTokens),
                E.fold(
                    sendDiscordMessageToChannel,
                    sendDiscordMessageToChannel
                )
            )()
            break;
        case 'search':
            pipe(
                Opt.option.map(
                    remainingTokens,
                    (tokens: NEL.NonEmptyArray<string>) => {
                        return pipe(
                            getPossibleSoundByte(tokens, 10),
                            TE.map(
                                Opt.map(soundBytes => ({
                                    embeddedMessages: NEL.mapWithIndex((i: number, sb: SoundByte) => createEmbeddedMessage(sb, i))(soundBytes),
                                    soundBytes: soundBytes
                                }))
                            )
                        )
                    }
                ),
                Opt.fold(
                    () => sendDiscordMessageToChannel('You need to specify a search string!'),
                    TE.fold(
                        (error: Error) => T.task.chain(
                            T.task.of(console.error(`Failed to find sound bytes!`, error)),
                            () => sendDiscordMessageToChannel('Failed to find sound bytes')
                        ),
                        Opt.fold(
                            () => sendDiscordMessageToChannel('Could not find any sound bytes for the search string'),
                            ({ soundBytes, embeddedMessages }: TransformedMessages) => {
                                if (message.channel instanceof TextChannel) {
                                    return pipe(
                                        () => (message.channel as TextChannel).createWebhook("ByteMeSearchResults"),
                                        T.chain(hook => {
                                            return T.task.chain(
                                                T.fromIO(userStateMap.startSearchForUser(message.author.id, createUserInteractionState(soundBytes, hook))),
                                                () => () => hook.send(
                                                    `Type the number of the sound byte you want <@${message.author}> or 'cancel'`,
                                                    {
                                                        embeds: embeddedMessages,
                                                    }
                                                )
                                            )
                                        }),
                                        T.chainFirst(sentMessage => T.fromIO(
                                                userStateMap.updateUserStateWithMessage(message.author.id)(sentMessage)
                                            )
                                        )
                                    )
                                }
                                else {
                                    return sendDiscordMessageToChannel(`Unable to send embedded message since channel is not a TextChannel`)
                                }
                            }
                        )
                    )
                )
            )()
            break;
        case 'cancel':
            T.task.chain(
                T.fromIO(userStateMap.removeSearchForUser(message.author.id)),
                Opt.fold(
                    () => T.of(message.author.id),
                    userState => pipe(
                        Opt.map((_: Message) => _.delete())(userState.message),
                        () => () => userState.webhook.delete(),
                        T.map(() => message.author.id)
                    )
                )
            )()
            break;
        case 'help':
            const sendHelpDialog: T.Task<Message> =
            sendDiscordMessageToChannel(
                "The following commands are available:"
                + "\n\t" + "- '/byteMe [optional search phrase]'"
                + "\n\t\t\t" + "- Returns a sound byte matching the phrase or random if ommitted"
                + "\n\t" + "- '/search [search phrase]'"
                + "\n\t\t\t" + "- Returns up to 10 results that match the search phrase allowing the user to select or cancel"
                + "\n\t" + "- '/help'"
                + "\n\t\t\t" + "- Prints this message to the channel"
            )

            sendHelpDialog()
        default:
    }
}

const handleNumberCommand = (message: Message) => (number: number) => {
    pipe(
        T.fromIO(userStateMap.lookupByUser(message.author.id)),
        T.map(Opt.chain(userState => (number < 0 || number >= userState.searchResults.length) ? Opt.none : Opt.some(userState))),
        T.chain(Opt.fold(
            () => T.of(message.author.id),
            () => pipe(
                T.fromIO(userStateMap.removeSearchForUser(message.author.id)),
                T.map(Opt.map(userState => pipe(
                    Opt.map((_: Message) => _.delete())(userState.message),
                    () => () => userState.webhook.delete(),
                    T.chain(() => () => message.channel.send(userState.searchResults[number].url)),
                    T.map(() => message.author.id)
                ))),
                T.map(Opt.getOrElse(() => T.of(message.author.id))),
                T.flatten
            ),
        ))
    )()
}

const getSoundByteUrl = (remainingTokens: Opt.Option<NEL.NonEmptyArray<string>>) => {
    return pipe(
        getSoundByteOrRandomDefault(remainingTokens),
        foldEitherErrorOrSoundByte,
        T.map(Opt.map((soundByte: SoundByte) => soundByte.url)),
        T.map(E.fromOption(() => `Unable to find any sound byte`))
    )
}

const getSoundByteOrRandomDefault = (remainingTokens: Opt.Option<NEL.NonEmptyArray<string>>) => {
    return Opt.fold(
        () => getRandomSoundByte(),
        (tokens: NEL.NonEmptyArray<string>) => {
            return pipe(
                getPossibleSoundByte(tokens, 1),
                TE.map(Opt.map(Arr.head)),
                TE.map(Opt.flatten)
            )
        }
    )(remainingTokens)
}

const getPossibleSoundByte = (tokens: NEL.NonEmptyArray<string>, limit: number) => {
    const searchString = joinTokens(tokens)
    return getSoundByteThatMatches(searchString, limit)
}