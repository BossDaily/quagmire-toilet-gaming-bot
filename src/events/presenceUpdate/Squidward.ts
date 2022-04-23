
import { Canvas,createCanvas, loadImage } from "canvas";

const SquidWard = (vidya: string) => {
    const canvas = createCanvas(600, 548)
    const ctx = canvas.getContext('2d')
    ctx.font = '48ptx impact'
    ctx.fillStyle = '#fffff'
    ctx.fillText(`${vidya} player`, canvas.width/ 1.5, canvas.height / 0.5)
    const bg = loadImage('https://media.discordapp.net/attachments/762378948566319136/967236176673128478/squidwardpointlaugh.jpg')


}