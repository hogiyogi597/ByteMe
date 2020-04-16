import * as T from 'fp-ts/lib/Task'
import * as TE from 'fp-ts/lib/TaskEither'
import * as Opt from 'fp-ts/lib/Option'
import { SoundByte } from '../get-yarn/models'

export const foldEitherErrorOrSoundByte = (errorOrSoundByte: TE.TaskEither<Error, Opt.Option<SoundByte>>) => {
    return TE.fold(
        (error: Error) => {
            console.error(error.message)
            return T.task.of(Opt.none)
        },
        (maybeSoundByte: Opt.Option<SoundByte>) => T.task.of(maybeSoundByte)
    )(errorOrSoundByte)
}