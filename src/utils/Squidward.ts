
import { Canvas,createCanvas, loadImage } from "canvas";
import { Channel, MessageAttachment } from "discord.js";

export const SquidWard = async (vidya: string, channel:any, user: string) => {
    const canvas = createCanvas(600, 548)
    const ctx = canvas.getContext('2d')

    ctx.font = '48px Impact'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(`${vidya} player`, canvas.width/ 1.5, canvas.height / 0.5)

    await loadImage('https://media.discordapp.net/attachments/762378948566319136/967236176673128478/squidwardpointlaugh.jpg').then((bg) => {
        ctx.drawImage(bg, 0, 0, canvas.width, canvas.height)

        

        
    })
    const attch = new MessageAttachment(canvas.toBuffer(), 'fart.jpg')
    
    channel.send({content: `${user} ${vidya}`, file:[attch] })

    
}