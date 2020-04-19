import { MessageEmbed, TextChannel, DMChannel, NewsChannel } from 'discord.js'
import { SoundByte } from '../get-yarn/models'

export const createEmbeddedMessage = (soundByte: SoundByte, index: number): MessageEmbed => {
    return new MessageEmbed()
        .setTitle(`${index}. ${soundByte.title}`)
        .setDescription(soundByte.transcript)
        .setThumbnail(soundByte.gif)
        .setFooter(soundByte.duration)
        .setColor(0x00ff00)
}

export const sendDiscordMessage = (channel: TextChannel | DMChannel | NewsChannel) => (content: string) => () => channel.send(content)