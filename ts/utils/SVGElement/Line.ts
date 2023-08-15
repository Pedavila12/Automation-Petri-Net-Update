import { createSVGElement, SVGElementAttrs } from "./base.js";
import Vector from "../Vector.js";

export function getLineStartPoint(line: SVGLineElement) {
    return new Vector(
        parseFloat(<string>line.getAttribute('x1')),
        parseFloat(<string>line.getAttribute('y1'))
    )
}

export function setLineStartPoint(line: SVGLineElement, point: Vector) {
    line.setAttribute('x1', String(point.x))
    line.setAttribute('y1', String(point.y))
}

export function getLineEndPoint(line: SVGLineElement) {
    return new Vector(
        parseFloat(<string>line.getAttribute('x2')),
        parseFloat(<string>line.getAttribute('y2'))
    )
}

export function setLineEndPoint(line: SVGLineElement, point: Vector) {
    line.setAttribute('x2', String(point.x))
    line.setAttribute('y2', String(point.y))
}

export function getLineMidPoint(line: SVGLineElement) {
    return getLineStartPoint(line).add(getLineEndPoint(line)).mul(0.5)
}

export function getLineDirection(line: SVGLineElement) {
    return getLineEndPoint(line).sub(getLineStartPoint(line)).norm()
}

export function updateLine(
    line: SVGLineElement, 
    startPoint: Vector, 
    endPoint: Vector
) {
    setLineStartPoint(line, startPoint)
    setLineEndPoint(line, endPoint)
}

export function invertLine(line: SVGLineElement) {
    updateLine(
        line,
        getLineEndPoint(line),
        getLineStartPoint(line),
    )
}

export function createLine(
    startPoint: Vector, 
    endPoint: Vector, 
    attrs: SVGElementAttrs = {}
) {
    const line = <SVGLineElement>createSVGElement('line', attrs)
    setLineStartPoint(line, startPoint)
    setLineEndPoint(line, endPoint)

    return line
}