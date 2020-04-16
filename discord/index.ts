import Discord, { Snowflake, MessageEmbed, Message, TextChannel, Webhook } from 'discord.js'
import dotenv from 'dotenv'
import { searchYarn, parseYarnResults } from '../get-yarn'
import { SoundByte } from '../get-yarn/models'
dotenv.config()

const botPrefix = '/'
const userInteractionMap: Map<Snowflake, UserInteractionState> = new Map()

enum InteractionStatus {
    SearchPending
}

class UserInteractionState {
    constructor(public status: InteractionStatus, public searchResults: SoundByte[], public webhook: Webhook, public message?: Message) {}

    setMessage(message: Message) {
        this.message = message;
    }
}

const client = new Discord.Client()

client.on('ready', () => {
    console.log('Bot connected to server');
});
if(commandTokens.length < 1) {
            message.channel.send("You need to specify a search string!")
        } 
        else {
            const searchResults = await searchYarn(commandTokens.join(" "))
            const soundBytes = parseYarnResults(searchResults, 10)
            if(message.channel instanceof TextChannel) {
                (message.channel as TextChannel).createWebhook("ByteMeSearchResults")
                .then(hook => {
                    userInteractionMap.set(message.author.id, new UserInteractionState(InteractionStatus.SearchPending, soundBytes, hook))
                    hook.send(
                        `Type the number of the sound byte you want <@${message.author}>`, 
                        { 
                            embeds: soundBytes.map(createEmbeddedMessage),
                        }
                    ).then(msg => {
                        userInteractionMap.get(message.author.id)!.setMessage(msg)
                    })
                })
            }
            // Promise.all(soundBytes.map(createEmbeddedMessage).map(_ => message.channel.send(_))).then(_ => userInteractionMap.get(message.author.id)!.messagesToDelete = _)
        }
client.on('message', async message => {
    const commandTokens = message.content.split(" ")
    const firstCommand = commandTokens.shift()
    if(firstCommand === botPrefix + 'search') {
        
    }
    else if(firstCommand === botPrefix + 'byteMe') {
        if(commandTokens.length < 1) {
            message.channel.send("You need to specify a search string!")
        }
        else {
            const searchResults = await searchYarn(commandTokens.join(" "))
            const selectedSoundByte = parseYarnResults(searchResults, 1).shift()
            message.channel.send(selectedSoundByte!.url)
        }
    }
    else if(typeof parseInt(firstCommand!) === 'number' && userInteractionMap.has(message.author.id)) {
        const userInteraction = userInteractionMap.get(message.author.id)!
        userInteractionMap.delete(message.author.id)
        const discordMessage = userInteraction.message!
        discordMessage.delete()
        userInteraction.webhook.delete().then(() => {
            console.log(`webhook deleted: ${userInteraction.webhook}`)
            message.channel.send(userInteraction.searchResults[parseInt(firstCommand!)].url)
        })
    }
});

client.login(process.env.DISCORD_TOKEN);

const createEmbeddedMessage = (soundByte: SoundByte, index: number): MessageEmbed => {
    return new MessageEmbed()
            .setTitle(`${index}. ${soundByte.title}`)
            .setDescription(soundByte.transcript)
            .setThumbnail(soundByte.gif)
            .setFooter(soundByte.duration)
            .setColor(0x00ff00)
}