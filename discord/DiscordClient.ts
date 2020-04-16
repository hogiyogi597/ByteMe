import Discord, { Client } from 'discord.js'
import { Task, task } from 'fp-ts/lib/Task'
import dotenv from 'dotenv'
import { handleMessage } from './messageHandler';

dotenv.config()

class DiscordClient {
    client = new Discord.Client();
    public run: Task<DiscordClient>

    constructor() {
        const loginTask: Task<string> = () => this.client.login(process.env.DISCORD_TOKEN)
        const readyTask: Task<Client> = task.of(this.client.on('ready', () => console.log('Bot connected to server')))
        const messageTask: Task<Client> = task.of(this.client.on('message', handleMessage))

        this.run = task.chain(
            loginTask,
            _ => task.chain(
                readyTask,
                _ => task.map(
                    messageTask,
                    _ => this
                )
            )
        )
    }
}

new DiscordClient().run()