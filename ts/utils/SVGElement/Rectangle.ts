import Vector from "../Vector.js";
import { createSVGElement, SVGElementAttrs } from "./base.js";

function getRectPos(rect: SVGRectElement) {
    return new Vector(
        parseInt(<string>rect.getAttribute('x')),
        parseInt(<string>rect.getAttribute('y'))
    )
}

function setRectPos(rect: SVGRectElement, pos: Vector) {
    rect.setAttribute('x', String(pos.x))
    rect.setAttribute('y', String(pos.y))
}

function setRectCenter(rect: SVGRectElement, pos: Vector) {
    setRectPos(rect, pos.sub(getRectSizeAsVector(rect).mul(0.5)))
}

function getRectWidth(rect: SVGRectElement) {
    return parseInt(<string>rect.getAttribute('width'))
}

function setRectWidth(rect: SVGRectElement, width: number) {
    rect.setAttribute('width', String(width))
}

function getRectHeight(rect: SVGRectElement) {
    return parseInt(<string>rect.getAttribute('height'))
}

function setRectSize(rect: SVGRectElement, width: number, height: number) {
    setRectWidth(rect, width)
    setRectHeight(rect, height)
}

function setRectHeight(rect: SVGRectElement, height: number) {
    rect.setAttribute('height', String(height))
}

function getRectSizeAsVector(rect: SVGRectElement) {
    return new Vector(getRectWidth(rect), getRectHeight(rect))
}

function createRect(
    pos: Vector, 
    width: number, 
    height: number,
    attrs: SVGElementAttrs = {}
) {
    const rect = <SVGRectElement>createSVGElement('rect', attrs)
    setRectHeight(rect, height)
    setRectWidth(rect, width)
    setRectCenter(rect, pos)

    return rect
}

export { getRectPos, getRectHeight, getRectWidth, getRectSizeAsVector, setRectHeight, 
    setRectWidth, setRectSize, setRectPos, setRectCenter, createRect }
