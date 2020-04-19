import cheerio from 'cheerio'
import axios from 'axios'
import { SoundByte } from './models'
import { array } from 'fp-ts/lib/Array'
import { sequenceS } from 'fp-ts/lib/Apply'
import * as Opt from 'fp-ts/lib/Option'
import { fromArray, NonEmptyArray } from 'fp-ts/lib/NonEmptyArray'
import { pipe } from 'fp-ts/lib/pipeable'
import * as TE from 'fp-ts/lib/TaskEither'

const baseUrl = 'https://getyarn.io'

export const searchYarn = (value: string): TE.TaskEither<Error, string> => {
    return yarnRequest(
        '/yarn-find', 
        Opt.some({ "text": value })
    )
}

export const popularYarn = (): TE.TaskEither<Error, string> => {
    return yarnRequest('/yarn-popular')
}

const yarnRequest = (url: string, params: Opt.Option<{text: string}> = Opt.none): TE.TaskEither<Error, string> => {
    return TE.taskEither.chain(
        TE.tryCatch(
            () => axios.get<string>(url, { baseURL: baseUrl, params: Opt.toNullable(params) }),
            reason => new Error(`Failed yarn request: ${reason}`)
        ),
        webpageRequest => webpageRequest.status === 200 ? TE.right(webpageRequest.data) : TE.left(new Error(`Failed to search yarn for url: ${url} and params: ${JSON.stringify(params)}`))
    )
}

export const parseYarnResults = (html: string, resultsLimit: number): Opt.Option<NonEmptyArray<SoundByte>> => {
    const $ = cheerio.load(html)
    const maybeSoundBytes: Array<Opt.Option<SoundByte>> = array.map(
        $('.clip-wrap').toArray(),
        element => {
            return sequenceS(Opt.option)({
                url: Opt.map(url => baseUrl + url)(Opt.fromNullable($('a', element).attr('href'))),
                gif: Opt.fromNullable($('.img-match', element).attr('src')),
                title: Opt.fromNullable($('.title', element).text()),
                transcript: Opt.fromNullable($('.transcript', element).text()),
                duration: Opt.fromNullable($('.play-time', element).text()),
            })
        }
    )
    
    return pipe(
        maybeSoundBytes,
        array.compact,
        _ => _.slice(0, resultsLimit),
        fromArray
    )
}