function WindowProperties(interpretedTree, petriClass, targetMarking) {
    const width = 2000;
    const height = 2000;
    const margin = { top: 40, right: 20, bottom: 20, left: 20 };
    let angle = 0;


    // Criação do contêiner SVG para o gráfico
    const svg = d3
        .select("#property-container")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

}
class WindowProperties {
    constructor() {
        this.saveObserver = null;
        document.getElementById('select-property-safety')
            .onclick = console.log("Teste");
        document.getElementById('select-property-boundedness')
            .onclick = this.close;
        document.getElementById('select-property-conservation')
            .onclick = this.close;
        document.getElementById('select-property-reversibility')
            .onclick = () => this.save();
        document.getElementById('select-property-markin-reachability')
            .onclick = () => this.save();
    }

}
export { WindowProperties }