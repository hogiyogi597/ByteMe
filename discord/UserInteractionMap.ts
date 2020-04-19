import { Snowflake, Message } from 'discord.js'
import { UserInteractionState } from './models'
import * as Opt from 'fp-ts/lib/Option'
import * as IO from 'fp-ts/lib/IO'
import * as M from 'fp-ts/lib/Map'
import * as Eq from 'fp-ts/lib/Eq'
import { pipe } from 'fp-ts/lib/pipeable'

class UserInteractionMap {
    searchInteraction: Map<Snowflake, UserInteractionState> = new Map()

    lookupByUser = (id: Snowflake): IO.IO<Opt.Option<UserInteractionState>> => {
        return IO.of(M.lookup(Eq.eqString)(id, this.searchInteraction))
    }

    startSearchForUser = (id: Snowflake, userInteraction: UserInteractionState): IO.IO<UserInteractionState> => {
        return pipe(
            IO.of(M.insertAt(Eq.eqString)(id, userInteraction)(this.searchInteraction)),
            IO.map(newMap => {
                this.replaceMap(newMap)
                return userInteraction
            })
        )
    }

    updateUserStateWithMessage = (id: Snowflake) => (message: Message): IO.IO<Opt.Option<Map<Snowflake, UserInteractionState>>> => {
        const modifyMap = IO.of(
            M.modifyAt(Eq.eqString)
                (
                    id,
                    (searchState: UserInteractionState): UserInteractionState => ({ ...searchState, message: Opt.some(message) })
                )(this.searchInteraction)
        )

        return pipe(
            modifyMap,
            IO.map(Opt.map(newMap => {
                this.replaceMap(newMap)
                return newMap
            }))
        )
    }

    removeSearchForUser = (id: Snowflake): IO.IO<Opt.Option<UserInteractionState>> => {
        return pipe(
            this.lookupByUser(id),
            IO.map(Opt.map(userState => {
                const newMap = M.deleteAt(Eq.eqString)(id)(this.searchInteraction)
                this.replaceMap(newMap)
                return userState
            }))
        )
    }

    private replaceMap = (newMap: Map<Snowflake, UserInteractionState>) => {
        this.searchInteraction = newMap
    }
}

export default UserInteractionMap;