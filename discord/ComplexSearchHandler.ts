import { Snowflake, Message, Webhook } from 'discord.js'
import { SoundByte } from '../get-yarn/models';
import * as T from 'fp-ts/lib/Task';
import * as IO from 'fp-ts/lib/IO';
import * as M from 'fp-ts/lib/Map'
import * as Eq from 'fp-ts/lib/Eq'
import { pipe } from 'fp-ts/lib/pipeable';

interface UserInteractionState {
    searchResults: SoundByte[],
    webhook: Webhook,
    message?: Message
}

class ComplexSearchHandler {
    private searchInteraction: Map<Snowflake, UserInteractionState> = new Map()

    searchForMatches = (user: Snowflake, search: string): T.Task<Array<SoundByte>> => {
        
    }

    cancelSearch = (user: Snowflake): T.Task<UserInteractionState> => {
        pipe(
            M.lookupWithKey(Eq.eqString)(user, this.searchInteraction),
            // turn it into an TaskEither here?
        )
        return IO.io.map(
            IO.of(M.deleteAt(Eq.eqString)(user)),
            _ => user
        )
    }

    confirmSelectionForUser = (user: Snowflake): IO.IO<SoundByte> => {

    }
}

export default ComplexSearchHandler