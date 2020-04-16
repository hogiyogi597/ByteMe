import Discord, { Snowflake, MessageEmbed, Message, TextChannel, Webhook, Client } from 'discord.js'
import { fromArray, head, NonEmptyArray, tail } from 'fp-ts/lib/NonEmptyArray'
import * as Opt from 'fp-ts/lib/Option'
import { getRandomSoundByte, getSoundByteThatMatches } from './SimpleSearchHandler'
import { SoundByte } from '../get-yarn/models'
import { pipe } from 'fp-ts/lib/pipeable'
import * as S from 'fp-ts/lib/Semigroup'
import * as T from 'fp-ts/lib/Task'

const botPrefix = '\/'

export const handleMessage = (message: Message) => {
    Opt.option.map(
        fromArray(message.content.split(' ')), 
        tokens => {
            const command = head(tokens)
            const parsedNumber = Number.parseInt(command)
            const maybeNumber = isNaN(parsedNumber) ? Opt.none : Opt.some(parsedNumber)

            Opt.fold(
                handleStringCommand(message, command, fromArray(tail(tokens))),
                handleNumberCommand(message)
            )(maybeNumber)
        }
    )

}

const handleStringCommand = (message: Message, command: string, remainingTokens: Opt.Option<NonEmptyArray<string>>) => () => {
    const trimmedCommand = command.substring(command.indexOf(botPrefix) + 1)
    
    if(trimmedCommand === command)
        return

    switch(trimmedCommand) {        
        case 'byteMe':
            const findAndReturnSoundByte = pipe(
                getPossibleSoundByte(remainingTokens),
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
            // send message with all of the options
            // add user to state map

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

const getPossibleSoundByte = (remainingTokens: Opt.Option<NonEmptyArray<string>>): T.Task<Opt.Option<SoundByte>> => {
    return Opt.fold(
        () => getRandomSoundByte(),
        (tokens: NonEmptyArray<string>) => {
            const semigroupSpace: S.Semigroup<string> = {
                concat: (x, y) => x + ' ' + y
            }
            const searchString = S.fold(semigroupSpace)('', tokens).trimLeft()
            return getSoundByteThatMatches(searchString)
        }
    )(remainingTokens)
}