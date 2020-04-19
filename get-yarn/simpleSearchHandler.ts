import { searchYarn, parseYarnResults, popularYarn } from "./yarnClient"
import * as Arr from 'fp-ts/lib/Array'
import { randomInt } from 'fp-ts/lib/Random'
import { SoundByte } from "./models"
import * as Opt from "fp-ts/lib/Option"
import * as NEL from "fp-ts/lib/NonEmptyArray"
import { pipe } from 'fp-ts/lib/pipeable'
import { identity } from 'fp-ts/lib/function'
import * as TE from 'fp-ts/lib/TaskEither'

// TODO: add in list of default random yarns
const defaultRandomYarns: NEL.NonEmptyArray<SoundByte> = [{ url: "", duration: "", gif: "", title: "", transcript: "" }]
const numberOfRandomResults = 25

export const getRandomSoundByte = (): TE.TaskEither<Error, Opt.Option<SoundByte>> => {
    return TE.taskEither.chain(
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
}

export const getSoundByteThatMatches = (search: string, limit: number): TE.TaskEither<Error, Opt.Option<NEL.NonEmptyArray<SoundByte>>> => {
    return TE.taskEither.map(
        searchYarn(search),
        html => parseYarnResults(html, limit)
    )
}