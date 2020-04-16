import Discord, { Snowflake, MessageEmbed, Message, TextChannel, Webhook, Client } from 'discord.js'
import { UserInteractionState, createUserInteractionState } from './models'
import { getRandomSoundByte, getSoundByteThatMatches } from './simpleSearchHandler'
import * as NEL from 'fp-ts/lib/NonEmptyArray'
import * as Arr from 'fp-ts/lib/Array'
import * as Opt from 'fp-ts/lib/Option'
import { SoundByte } from '../get-yarn/models'
import { pipe } from 'fp-ts/lib/pipeable'
import * as S from 'fp-ts/lib/Semigroup'
import * as T from 'fp-ts/lib/Task'
import * as TE from 'fp-ts/lib/TaskEither'
import * as M from 'fp-ts/lib/Map'
import * as Eq from 'fp-ts/lib/Eq'
import * as fpUtils from '../fp-utils'
import { foldEitherErrorOrSoundByte } from '../fp-utils'

const botPrefix = '\/'
const searchInteraction: Map<Snowflake, UserInteractionState> = new Map()

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
    const trimmedCommand = command.substring(command.indexOf(botPrefix) + 1)

    if (trimmedCommand === command)
        return

    switch (trimmedCommand) {
        case 'byteMe':
            const findAndReturnSoundByte = pipe(
                Opt.fold(
                    () => getRandomSoundByte(),
                    (tokens: NEL.NonEmptyArray<string>) => {
                        return pipe(
                            getPossibleSoundByte(tokens, 1),
                            TE.map(Opt.map(Arr.head)),
                            TE.map(Opt.flatten)
                        )
                    }
                )(remainingTokens),
                fpUtils.foldEitherErrorOrSoundByte,
                T.map(
                    Opt.fold(
                        () => `Unable to find any sound byte`,
                        (soundByte: SoundByte) => soundByte.url
                    )
                ),
                T.chain((msgContent: string): T.Task<Message> => {
                    return () => message.channel.send(msgContent)
                })
            )

            findAndReturnSoundByte()
            break;
        case 'search':
            const temp: TE.TaskEither<Error, Message> = Opt.fold<NEL.NonEmptyArray<string>, T.Task<Discord.Message>>(
                () => () => message.channel.send("You need to specify a search string!"),
                (tokens: NEL.NonEmptyArray<string>) => {
                    return pipe(
                        getPossibleSoundByte(tokens, 10),
                        TE.map(
                            Opt.fold<NEL.NonEmptyArray<SoundByte>, T.Task<Message>>(
                                () => () => message.channel.send("Unable to find any sound byte"),
                                soundBytes => {
                                    const embeddedMessages = NEL.mapWithIndex((i: number, sb: SoundByte) => createEmbeddedMessage(sb, i))(soundBytes)
                                    if (message.channel instanceof TextChannel) {
                                        return pipe(
                                            () => (message.channel as TextChannel).createWebhook("ByteMeSearchResults"),
                                            T.chain(hook => {
                                                M.insertAt(Eq.eqString)(message.author.id, createUserInteractionState(soundBytes, hook))(searchInteraction)
                                                return () => hook.send(
                                                    `Type the number of the sound byte you want <@${message.author}> or 'cancel'`,
                                                    {
                                                        embeds: embeddedMessages,
                                                    }
                                                )
                                            }),
                                            T.map(sentMessage => {
                                                M.modifyAt(Eq.eqString)
                                                (
                                                    message.author.id, 
                                                    (searchState: UserInteractionState): UserInteractionState => ({...searchState, message: sentMessage})
                                                )
                                                (searchInteraction)
                                                return sentMessage
                                            })
                                        )
                                    }
                                    else {
                                        return () => message.channel.send(`Unable to send embedded message since channel is not a TextChannel`)
                                    }
                                }
                            )
                        )
                    )
                }
            )(remainingTokens)
            break;
        case 'cancel':
            // delete search message
            break;
        case 'help':
        default:
    }
}

const handleNumberCommand = (message: Message) => (number: number) => {
    console.log("handling number command")
}

const getPossibleSoundByte = (tokens: NEL.NonEmptyArray<string>, limit: number) => {
    const searchString = joinTokens(tokens)
    return getSoundByteThatMatches(searchString, limit)
}

const joinTokens = (tokens: NEL.NonEmptyArray<string>): string => {
    const semigroupSpace: S.Semigroup<string> = {
        concat: (x, y) => x + ' ' + y
    }
    return S.fold(semigroupSpace)('', tokens).trimLeft()
}

const createEmbeddedMessage = (soundByte: SoundByte, index: number): MessageEmbed => {
    return new MessageEmbed()
        .setTitle(`${index}. ${soundByte.title}`)
        .setDescription(soundByte.transcript)
        .setThumbnail(soundByte.gif)
        .setFooter(soundByte.duration)
        .setColor(0x00ff00)
}