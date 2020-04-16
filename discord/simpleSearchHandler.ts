import { searchYarn, parseYarnResults, popularYarn } from "../get-yarn"
import { Task, task } from "fp-ts/lib/Task"
import * as Arr from 'fp-ts/lib/Array'
import { randomInt } from 'fp-ts/lib/Random'
import { SoundByte } from "../get-yarn/models"
import * as Opt from "fp-ts/lib/Option"
import * as NEL from "fp-ts/lib/NonEmptyArray"
import { pipe } from 'fp-ts/lib/pipeable'
import { identity } from 'fp-ts/lib/function'
import * as TE from 'fp-ts/lib/TaskEither'

const defaultRandomYarns: NEL.NonEmptyArray<SoundByte> = [{ url: "", duration: "", gif: "", title: "", toString: () => "", transcript: "" }]
const numberOfRandomResults = 25

export const getRandomSoundByte = (): Task<Opt.Option<SoundByte>> => {
    const resultOrError = TE.taskEither.chain(
        popularYarn(),
        html => pipe(
            parseYarnResults(html, numberOfRandomResults),
            Opt.fold(() => defaultRandomYarns, identity),
            yarns => TE.taskEither.chain(
                TE.taskEither.fromIO(randomInt(0, numberOfRandomResults - 1)),
                randomSelection => TE.right(Arr.lookup(randomSelection & yarns.length, yarns))
            )
        )
    )

    return foldEitherErrorOrSoundByte(resultOrError)
}

export const getSoundByteThatMatches = (search: string): Task<Opt.Option<SoundByte>> => {
    const resultOrError = TE.taskEither.map(
        searchYarn(search),
        html => pipe(
            parseYarnResults(html, 1),
            Opt.map(yarns => Arr.head(yarns)),
            Opt.flatten
        )
    )
    return foldEitherErrorOrSoundByte(resultOrError)
}

const foldEitherErrorOrSoundByte = (errorOrSoundByte: TE.TaskEither<Error, Opt.Option<SoundByte>>) => {
    return TE.fold(
        (error: Error) => {
            console.error(error.message)
            return task.of(Opt.none)
        },
        (maybeSoundByte: Opt.Option<SoundByte>) => task.of(maybeSoundByte)
    )(errorOrSoundByte)
}