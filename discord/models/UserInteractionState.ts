import { SoundByte } from "../../get-yarn/models";
import { Webhook, Message } from "discord.js";

export interface UserInteractionState {
    searchResults: SoundByte[],
    webhook: Webhook,
    message?: Message
}

export const createUserInteractionState = (searchResults: SoundByte[], webhook: Webhook, message?: Message): UserInteractionState => ({
    searchResults: searchResults,
    webhook: webhook,
    message: message
})