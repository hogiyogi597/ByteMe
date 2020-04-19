import { SoundByte } from "../../get-yarn/models";
import { Webhook, Message } from "discord.js";
import * as Opt from 'fp-ts/lib/Option'

export interface UserInteractionState {
    searchResults: SoundByte[],
    webhook: Webhook,
    message: Opt.Option<Message>
}

export const createUserInteractionState = (searchResults: SoundByte[], webhook: Webhook, message: Opt.Option<Message> = Opt.none): UserInteractionState => ({
    searchResults: searchResults,
    webhook: webhook,
    message: message
})