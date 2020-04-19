import * as NEL from 'fp-ts/lib/NonEmptyArray'
import * as S from 'fp-ts/lib/Semigroup'

const semigroupSpace: S.Semigroup<string> = {
    concat: (x, y) => x + ' ' + y
}

export const joinTokens = (tokens: NEL.NonEmptyArray<string>): string => S.fold(semigroupSpace)('', tokens).trimLeft()