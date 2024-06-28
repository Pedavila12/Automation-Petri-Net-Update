//Classe dos lugares
class Place {
    constructor(name, marking = 0, placeType, id) {
        this.name = name;
        this.marking = marking;
        this.placeType = placeType;
        this.id = id;
    }
}

//Classe das transições
class Transition {
    constructor(inputPlaces, outputPlaces, testPlace, inhibitorPlaces, id) {
        this.inputPlaces = inputPlaces;
        this.outputPlaces = outputPlaces;
        this.testPlace = testPlace;
        this.inhibitorPlaces = inhibitorPlaces;
        this.id = id;
    }

    toString() {
        return `T${JSON.stringify(this.id)}`;
    }
}

//Função para conversão da rede de petri no formato de exportação para o formato utilizada nas funções de cálculos simplificados
function ConvertPetriNet(netData) {
    const places = [];
    const transitions = [];

    // Criar lugares
    places.push(
        ...netData.places.map(placeData => {
            const place = new Place(placeData.name, parseInt(placeData.initialMark), placeData.placeType, placeData.id);
            return place;
        })
    );

    // Mapeia as transições
    netData.transitions.forEach(transData => {
        const inputArcs = {};
        const outputArcs = {};
        const testArcs = {};
        const inhibitorArcs = {};
        
        // Mapeia os arcos de entrada (input)
        netData.arcs
            .filter(arc => arc.transId === transData.id && arc.arcType === 'Input')
            .forEach(arc => {
                const place = places.find(place => place.id === arc.placeId);
                if (place) {
                    inputArcs[place.name] = parseInt(arc.weight);
                } else {
                    console.error(`Lugar não encontrado para o ID: ${arc.placeId}`);
                }
            });

         // Mapear os arcos de saída (output)
         netData.arcs
         .filter(arc => arc.transId === transData.id && arc.arcType === 'Output')
         .forEach(arc => {
             const place = places.find(place => place.id === arc.placeId);
             if (place) {
                 outputArcs[place.name] = parseInt(arc.weight);

                 // Verificar se é do tipo BOOL e não possui arco inibidor
                 if (place.placeType === 'BOOL' && 
                     !netData.arcs.some(inhibitorArc => inhibitorArc.transId === transData.id && inhibitorArc.arcType === 'Inhibitor')) {
                     inhibitorArcs[place.name] = place.marking === 0 ? 1 : place.marking;
                 }
             } else {
                 console.error(`Lugar não encontrado para o ID: ${arc.placeId}`);
             }
         });

        // Mapeia os arcos de teste (test)
        netData.arcs
            .filter(arc => arc.transId === transData.id && arc.arcType === 'Test')
            .forEach(arc => {
                const place = places.find(place => place.id === arc.placeId);
                if (place) {
                    testArcs[place.name] = parseInt(arc.weight);
                } else {
                    console.error(`Lugar não encontrado para o ID: ${arc.placeId}`);
                }
            });
        
        // Mapeia os arcos Inibidores (Inhibitor)
        netData.arcs
            .filter(arc => arc.transId === transData.id && arc.arcType === 'Inhibitor')
            .forEach(arc => {
                const place = places.find(place => place.id === arc.placeId);
                if (place) {
                    inhibitorArcs[place.name] = parseInt(arc.weight);
                } else {
                    console.error(`Lugar não encontrado para o ID: ${arc.placeId}`);
                }
            });

        

        // Cria a transição simplificada
        const transitionNumber = parseInt(transData.name.replace(/\D/g, ''), 10);
        const transition = new Transition(
            inputArcs,
            outputArcs,
            testArcs,
            inhibitorArcs,
            transitionNumber,
        );

        transitions.push(transition);
    });

    return { places, transitions };
}

export { ConvertPetriNet };
