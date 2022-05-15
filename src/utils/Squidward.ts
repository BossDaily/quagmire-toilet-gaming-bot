
import { Canvas,createCanvas, loadImage } from "canvas";
import { Channel, MessageAttachment } from "discord.js";

const applyText = (canvas:Canvas, text:string) => {
	const context = canvas.getContext('2d');

	// Declare a base size of the font
	let fontSize = 48;

	do {
		// Assign the font to the context and decrement it so it can be measured again
		context.font = `${fontSize -= 2}px impact`;
		// Compare pixel width of the text to the canvas minus the approximate avatar size
	} while (context.measureText(text).width > canvas.width - 300);

	// Return the result to use in the actual canvas
	return context.font;
};

export const SquidWard = async (vidya: string, channel:any, user: string) => {
    const canvas = createCanvas(600, 548)
    const ctx = canvas.getContext('2d')

    

    const bg = await loadImage('https://media.discordapp.net/attachments/762378948566319136/967236176673128478/squidwardpointlaugh.jpg')
    
    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height)

    ctx.font = applyText(canvas, `${vidya}`)
    ctx.fillStyle = '#ffffff'
    ctx.fillText( `${vidya} player`, canvas.width / 5.2, canvas.height / 1.2 )    
	
        
    
    const attch = new MessageAttachment(canvas.toBuffer(), 'fart.jpg')
    
    channel.send({content: `${user} ${vidya}`, files:[attch] })

    
}