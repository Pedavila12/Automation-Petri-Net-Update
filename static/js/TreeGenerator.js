class Place {
    constructor(name, marking = 0, isInhibitor = false,id) {
      this.name = name;
      this.marking = marking;
      this.isInhibitor = isInhibitor;
      this.id = id;
    }
  }
class Transition {
    constructor(inputPlaces, outputPlaces, isTest = false, id) {
        this.inputPlaces = inputPlaces;
        this.outputPlaces = outputPlaces;
        this.isTest = isTest;
        this.id = id;
    }
    toString() {
        return `T${JSON.stringify(this.id)}`;
    }
}
function generateTree(netData) {
    const places = [];
    const transitions = [];

    //console.log(JSON.stringify(netData))
    // Criar lugares
    places.push(
        ...netData.places.map(placeData => {
            const place = new Place(placeData.name, parseInt(placeData.initialMark), placeData.placeType === 'BOOL',placeData.id);
            //console.log(place)
            return place;
        })
    );

    // Criar transições
    /*transitions.push(
        ...netData.transitions.map(transData => {
            const inputArcs = [];
            const outputArcs = [];

            // Verificar se há arcos de entrada
            if (transData.input) {
                inputArcs.push(...Object.entries(transData.input).map(([placeName, weight]) => ({ [placeName]: parseInt(weight) })));
            }

            // Verificar se há arcos de saída
            if (transData.output) {
                outputArcs.push(...Object.entries(transData.output).map(([placeName, weight]) => ({ [placeName]: parseInt(weight) })));
            }

            const transition = new Transition(inputArcs, outputArcs, transData.inhibitor, transData.priority, transData.name);
            console.log(transition)
            return transition;
        })
    );

    // Criar arcos
    arcs.push(
        ...netData.arcs.map(arcData => {
            const arc = new Arc(
                arcData.placeId,
                arcData.transId,
                arcData.arcType,
                parseInt(arcData.weight),
                arcData.corners.map(corner => new Vector(corner.x, corner.y))
            );
            return arc;
        })
    );*/
    // Mapeia as transições
    netData.transitions.forEach(transData => {
        const inputArcs = {};
        const outputArcs = {};

        // Mapeia os arcs de input
        netData.arcs
            .filter(arc => arc.transId === transData.id && arc.arcType === 'Input')
            .forEach(arc => {
                const place = places.find(place => place.id === arc.placeId);
                //console.log(place.id);
                //console.log(arc.placeId)
                // Verifica se o lugar foi encontrado
                if (place) {
                    inputArcs[place.name] = parseInt(arc.weight);
                } else {
                    console.error(`Lugar não encontrado para o ID: ${arc.placeId}`);
                }
            });

        // Mapeia os arcs de output
        netData.arcs
            .filter(arc => arc.transId === transData.id && arc.arcType === 'Output')
            .forEach(arc => {
                const place = places.find(place => place.id === arc.placeId);
                if (place) {
                    outputArcs[place.name] = parseInt(arc.weight);
                } else {
                    console.error(`Lugar não encontrado para o ID: ${arc.placeId}`);
                }
            });

        // Mapeia os arcs de teste
        const hasTestArc = netData.arcs.some(arc => arc.transId === transData.id && arc.arcType === 'Test');

        const transitionNumber = parseInt(transData.name.replace(/\D/g, ''), 10);
        // Cria a transição simplificada
        const transition = new Transition(
            inputArcs,
            outputArcs,
            hasTestArc,
            transitionNumber
        );

        transitions.push(transition);
    });

    //console.log(places)
    //console.log(transitions)
    //window.open('TesteArvore.html', '_blank');  
    
    return { places, transitions };
}
//Application.editor.netData
//window.location.href = "TesteArvore.html"
//const netData = this.editor.net;
//const customFormatNet = generateTree(netData);
//console.log(generateTree(netData));

//{"name":"Untiteled_Net","places":[{"id":"856f0286-bc6a-47d4-9cec-5424ab3cd49d","elementType":"place","name":"p1","placeType":"INT","initialMark":"0","position":{"x":80.58761804826862,"y":45.3305351521511},"textsPosition":{"name":{"x":6.5,"y":-8},"placeType":{"x":7,"y":8.5}}},{"id":"6f18b10d-e503-4fda-9bc6-438f9199510a","elementType":"place","name":"p2","placeType":"INT","initialMark":"0","position":{"x":81.84679958027282,"y":123.08499475341029},"textsPosition":{"name":{"x":6.5,"y":-8},"placeType":{"x":7,"y":8.5}}}],"transitions":[{"id":"cf2be11c-7e78-456b-bcbb-300aded9e302","elementType":"trans","name":"t1","delay":"","guard":"","priority":"0","position":{"x":123.08499475341027,"y":87.51311647429172},"textsPosition":{"name":{"x":6,"y":-5.5},"delay":{"x":6,"y":5.5},"guard":{"x":-6,"y":-5.5}}}],"arcs":[{"id":"e70f8e79-5c7f-4103-bf0b-1f500ec400c1","elementType":"arc","placeId":"856f0286-bc6a-47d4-9cec-5424ab3cd49d","transId":"cf2be11c-7e78-456b-bcbb-300aded9e302","arcType":"Input","weight":"1","textsPosition":{"weight":{"x":0,"y":0}},"corners":[]},{"id":"fec8131e-6bad-432b-b2a2-14c128497910","elementType":"arc","placeId":"6f18b10d-e503-4fda-9bc6-438f9199510a","transId":"cf2be11c-7e78-456b-bcbb-300aded9e302","arcType":"Output","weight":"1","textsPosition":{"weight":{"x":0,"y":0}},"corners":[]}],"inputs":[],"grid":false,"nextPlaceNumber":3,"nextTransNumber":2,"viewBox":{"x":0,"y":0,"width":1500,"heigth":300},"preScript":"","simConfig":{"simMode":"Automation","arcDebug":false,"guardDebug":false,"priorityMode":"fixed"}}
export { generateTree };

