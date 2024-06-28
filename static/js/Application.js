import { generateCode } from "./CodeGenerator.js";
import Editor from "./Components/Editor.js";
import { InputConfig } from "./Components/InputsConfigWindow.js";
import { InputWindow } from "./Components/InputsWindow.js";
import { PetriNet } from "./PetriNetGraphics/PetriNet.js";
import { PropertyWindow } from "./Components/PropertyWindow.js";
import { SimConfigWindow } from "./Components/SimConfigWindow.js";
import { Simulator } from "./Components/Simulator.js";
import ToolBar from "./Components/ToolBar.js";
import { delay } from "./utils/utils.js";
import { SimulationError } from "./LogicalNet.js";
import { ConvertPetriNet } from "./ReachabilityTree/ConvertPetriNet.js";
import { PetriClass } from "./ReachabilityTree/PetriNetAndProperties.js";
import { reachabilityTree } from "./ReachabilityTree/PetriNetAndProperties.js";
import { interpretReachabilityTree } from "./ReachabilityTree/PetriNetAndProperties.js";
import { isBinaryAndSafe } from "./ReachabilityTree/PetriNetAndProperties.js";
import { isConservative } from "./ReachabilityTree/PetriNetAndProperties.js";
import { isReversible } from "./ReachabilityTree/PetriNetAndProperties.js";
import { isPetriNetLive } from "./ReachabilityTree/PetriNetAndProperties.js";
import { getMatrices } from "./ReachabilityTree/PetriNetAndProperties.js";
import { findPlaceInvariants } from "./ReachabilityTree/PetriNetAndProperties.js";
import { findTransitionInvariants } from "./ReachabilityTree/PetriNetAndProperties.js";    
import { isMarkingReachable } from "./ReachabilityTree/PetriNetAndProperties.js";
import { renderReachabilityTree } from "./ReachabilityTree//RenderReachabilityTree.js"

const FILE_PICKER_OPTIONS = {
    types: [{
        description: 'Automation Petri Net',
        accept: {
            'text/plain': ['.txt']
        }
    }],
    excludeAcceptAllOption: true,
    multiple: false
};
async function loadNet() {
    let fileHandle;
    //@ts-ignore
    [fileHandle] = await window.showOpenFilePicker(FILE_PICKER_OPTIONS);
    const file = await fileHandle.getFile();
    const fileText = await file.text();
    const netData = JSON.parse(fileText);
    return PetriNet.loadNet(netData);
}
async function saveNet(net) {
    let fileHandle;
    //@ts-ignore
    fileHandle = await window.showSaveFilePicker(FILE_PICKER_OPTIONS);
    const file = await fileHandle.createWritable();
    await file.write(JSON.stringify(net.getNetData()));
    await file.close();
}
export class Application {
    inputWindow;
    propertyWindow;
    inputsConfigWindow;
    simConfigWindow;
    toolBar;
    editor;
    simulator;
    constructor() {
        this.editor = null;
        this.propertyWindow = new PropertyWindow();
        this.inputWindow = new InputWindow();
        this.inputsConfigWindow = new InputConfig();
        this.simConfigWindow = new SimConfigWindow();
        this.toolBar = new ToolBar();
        this.simulator = null;
    }
    run() {
        this.bindNavBarButtons();
        this.bindToolBarButtons();
        this.bindSimulationButtons();
        this.bindGenCodeButtons();
        this.addEditorEventListeners();
        this.bindGenTreeButtons();
        this.bindPropertiesButtons();
        this.BindMatrixButtons();
        this.bindInvariantsButtons();
        this.bindInvTransitionButton();
        this.setTheme(localStorage.getItem("theme") ?? "light");
    }
    getEditor() {
        return this.editor;
    }
    loadNet(netData) {
        this.editor = new Editor(PetriNet.loadNet(netData), this.propertyWindow);
    }
    setTheme(theme) {
        document.body.className = `${theme}-theme net-${theme}-theme`;
        localStorage.setItem("theme", theme);
    }
    closeEditor() {
        if (!this.editor)
            return;
        if (!window.confirm("Unsaved changes will be lost, do you want to continue?"))
            return;
        this.editor.close();
        this.editor = null;
    }
    stopSimulation() {
    }
    startSimulation() {
        if (this.simulator)
            return;
        this.editor.currentTool.onChangeTool();
        try {
            this.simulator = new Simulator(this.editor.net, this.inputWindow);
        }
        catch (e) {
            if (!(e instanceof SimulationError))
                return;
            const { message, elementId } = e;
            this.simulator = null;
            this.editor.selectTool('mouse-tool');
            const errorModal = document.getElementById("error-modal");
            errorModal.showModal();
            document.getElementById("error-message").innerHTML = message;
            document.getElementById("error-select-element").onclick = elementId ?
                () => {
                    this.propertyWindow.open(this.editor.net.getGenericPEType(elementId), (attrName, val) => {
                        this.editor.net.setGenericPEAttr(elementId, attrName, val);
                    }, this.editor.net.getGenericPEData(elementId));
                    this.editor.net.selectPE(elementId);
                    errorModal.close();
                }
                : () => { };
            throw e;
        }
    }
    bindNavBarButtons() {
        const handlers = {
            "nav-btn-new-file": () => {
                this.closeEditor();
                this.editor = new Editor(PetriNet.newNet(), this.propertyWindow);
            },
            "nav-btn-close-file": () => {
                this.closeEditor();
            },
            "nav-btn-load-file": async () => {
                const net = await loadNet();
                this.closeEditor();
                this.editor = new Editor(net, this.propertyWindow);
            },
            "nav-btn-save-file": async () => {
                if (!this.editor)
                    return;
                await saveNet(this.editor.net);
            },
            "nav-btn-export": () => {
                if (!this.editor)
                    return;
                const ele = document.getElementById("nav-btn-export");
                ele.href = "data:text/plain;charset=utf-8," + JSON.stringify(this.editor.net.getNetData());
            },
            "nav-btn-toggle-grid": () => {
                if (!this.editor)
                    return;
                this.editor.net.grid = !this.editor.net.grid;
            },
            "nav-btn-toggle-theme": () => {
                const currentTheme = localStorage.getItem("theme");
                this.setTheme(currentTheme === "light" ? "dark" : "light");
            },
            "nav-btn-sim-config": async () => {
                if (!this.editor)
                    return;
                this.simConfigWindow.open(this.editor.net.simConfig, simConfig => this.editor.net.simConfig = simConfig);
            },
            "nav-btn-inputs-config": async () => {
                if (!this.editor)
                    return;
                this.inputsConfigWindow.open(this.editor.net.inputs, inputs => this.editor.net.inputs = inputs);
            }
        };
        for (const [btnId, handler] of Object.entries(handlers)) {
            const btn = document.getElementById(btnId);
            btn.onclick = handler;
        }
        const fileInputElement = document.getElementById("nav-btn-import");
        fileInputElement.onchange = async () => {
            if (this.editor)
                this.editor.close();
            if (!fileInputElement.files?.length)
                return;
            const data = await fileInputElement.files[0].text();
            if (!data)
                return;
            const net = PetriNet.loadNet(JSON.parse(data));
            this.editor = new Editor(net, this.propertyWindow);
        };
    }
    bindToolBarButtons() {
        const tools = [
            "mouse-tool",
            "place-tool",
            "trans-tool",
            "arc-tool"
        ];
        for (const tool of tools) {
            const btn = document
                .getElementById(tool);
            btn.onclick = () => {
                if (this.simulator || !this.editor)
                    return;
                this.toolBar.deselectTool(this.editor.currentToolName);
                this.toolBar.selectTool(tool);
                this.editor.selectTool(tool);
            };
        }
    }
    bindGenCodeButtons() {
        const genCodeModal = document
            .getElementById('gencode-modal');
        const handlers = {
            "nav-btn-gencode": () => {
                if (!this.editor)
                    return;
                genCodeModal.showModal();
                const ele = document
                    .getElementById('gencode-out');
                ele.value = generateCode(this.editor.net.getNetData());
            },
            "gencode-modal-close": () => {
                genCodeModal.close();
            },
            "gencode-close": () => {
                genCodeModal.close();
            },
        };
        for (const [btnId, handler] of Object.entries(handlers)) {
            const btn = document.getElementById(btnId);
            btn.onclick = handler;
        }
    }

    //Botão para abrir o modal que gera a árvore de alcansabilidade
    bindGenTreeButtons() {
        const genTreeModal = document
            .getElementById('gentree-modal');
        const treeContainer = document.getElementById('tree-container');
        const handlers = {
            "nav-btn-gentree": () => {
                if (!this.editor)
                    return;

                //Limpa o conteudo do modal para gerar um container novo
                treeContainer.innerHTML = '';
                genTreeModal.showModal();

                //Chama a rede de petri desenhada em tela
                const netData = this.editor.net.getNetData();
                //Converte a rede de petri para o formato utilizando no render
                const customFormatNet = ConvertPetriNet(netData);
                //Definir os lugares e transições para chamar as funções de tratamento e renderização da arvore de alcansabilidade
                const places = customFormatNet.places;
                const transitions = customFormatNet.transitions;
                const petriClass = new PetriClass(places, transitions);
                //console.log("Lugares: ",places);
                //console.log("Arvore classe: ",petriClass);
                const initialState = Object.fromEntries(
                    places.map((place) => [place.name, place.marking])
                );
                const tree = reachabilityTree(petriClass, initialState);
                //console.log("Arvore profundidade: ", tree);
                const interpretedTree = interpretReachabilityTree(tree);
                function findInfinityPseudoNode(interpretedTree) {
                    for (let node of interpretedTree) {
                        if(node.children[0].transition === "InfinityPseudoNode"){
                            return "Infinity Tree";
                        }
                    }
                    return false;
                }

                const infinityTree = findInfinityPseudoNode(interpretedTree);

                if(infinityTree){
                    treeContainer.innerHTML = '<p>Infinity Tree.</p>';
                    treeContainer.style.fontSize = '20pt';
                    treeContainer.style.textAlign = 'center'; 
                }else{
                    //console.log(interpretedTree);
                    renderReachabilityTree(interpretedTree);
                }

            }, "gentree-modal-close": () => {
                genTreeModal.close();
            },
            "gentree-close": () => {
                genTreeModal.close();
            },
        };
        for (const [btnId, handler] of Object.entries(handlers)) {
            const btn = document.getElementById(btnId);
            btn.onclick = handler;
        }
    }

    //Botão que abre a modal de propriedades 
    bindPropertiesButtons() {
        const propriertyModal = document.getElementById('property-modal');
        const propertyContainer = document.getElementById('property-container');

        const handlers = {
            "nav-btn-property": () => {
                if (!this.editor)
                    return;
                propertyContainer.innerHTML = '';
                propriertyModal.showModal();

                const netData = this.editor.net.getNetData();
                const customFormatNet = ConvertPetriNet(netData);
                const places = customFormatNet.places;
                const transitions = customFormatNet.transitions;
                const petriClass = new PetriClass(places, transitions);
                const initialState = Object.fromEntries(
                    places.map((place) => [place.name, place.marking])
                );
                const tree = reachabilityTree(petriClass, initialState);
                const interpretedTree = interpretReachabilityTree(tree);
                renderReachabilityTree(interpretedTree);

                // Atualizando o conteúdo da modal com todas as propriedades
                updateAllProperties(petriClass, interpretedTree);

                // Definindo o conteúdo inicial para Marcação Reachability
                if (places.length === 0 || transitions.length === 0) {
                    const initialMarkingReachabilityContent = '	There is no Petri Net for analysis';
                    document.getElementById('marking-reachability').textContent = initialMarkingReachabilityContent;
                }else{
                    const initialMarkingReachabilityContent = 'Fill in the appointments and see if it is reachable';
                    document.getElementById('marking-reachability').textContent = initialMarkingReachabilityContent;
                }

                // Criar inputs para cada lugar
                createInputForPlaces(places);

                // Adicionar botão de atualização
                addUpdateButton(interpretedTree, petriClass);
            },
            "property-modal-close": () => {
                propriertyModal.close();
            },
            "property-close": () => {
                propriertyModal.close();
            },
        };

        // Adiciona manipuladores de evento aos botões
        for (const [btnId, handler] of Object.entries(handlers)) {
            const btn = document.getElementById(btnId);
            btn.onclick = handler;
        }

        // Função para atualizar o conteúdo na modal com todas as propriedades em uma tabela
        function updateAllProperties(petriClass, interpretedTree) {
            const numPlaces = Object.keys(petriClass.places).length;
            const safetyContent = isBinaryAndSafe(petriClass);
            const vivacityContent = isPetriNetLive(interpretedTree, petriClass);
            const conservationContent = isConservative(interpretedTree, petriClass);
            const reversibilityContent = isReversible(interpretedTree, petriClass);
            const targetMarking = { 'p1': 0 };
            const limitationContent = petriClass.limitOfPetriNet();

            let tableContent = `
                <style>
                    .property-table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    .property-table th, .property-table td {
                        border: 1px solid black;
                        padding: 8px;
                        text-align: left;
                    }
                    .property-table th {
                        background-color: #f2f2f2;
                    }
                    .property-table td {
                        background-color: #fff;
                    }
                    .property-table tr {
                        height: 40px;
                    }
                    .input-container {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 10px;
                        align-items: center;
                        justify-content: center;
                        margin: 20px 0;
                    }
                    .input-container label {
                        font-family: Arial, sans-serif;
                        font-size: 14px;
                        font-weight: bold;
                    }
                    .input-field {
                        width: 80px;
                        padding: 6px;
                        border: 1px solid #ccc;
                        border-radius: 4px;
                    }
                    .update-button {
                        padding: 8px 16px;
                        background-color: #0056b3;
                        color: white;
                        border: none;
                        border-radius: 20px;
                        cursor: pointer;
                        font-family: Arial, sans-serif;
                        font-size: 14px;
                        font-weight: bold;
                        transition: background-color 0.3s;
                    }
                    .update-button:hover {
                        background-color: #007bff;
                        0056b3
                    }
                </style>
                <table class="property-table">
                    <thead>
                        <tr>
                            <th>Properties</th>
                            <th>Result</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Safety and Binary</td>
                            <td>${safetyContent}</td>
                        </tr>
                        <tr>
                            <td>Vivacity</td>
                            <td>${vivacityContent}</td>
                        </tr>
                        <tr>
                            <td>Conservation</td>
                            <td>${conservationContent}</td>
                        </tr>
                        <tr>
                            <td>Reversibility</td>
                            <td>${reversibilityContent}</td>
                        </tr>
                        <tr>
                            <td>Limitation</td>
                            <td>${limitationContent}</td>
                        </tr>
                        <tr>
                            <td>Marking Reachability</td>
                            <td id="marking-reachability"></td>
                        </tr>
                    </tbody>
                </table>
                <div class="input-container" id="input-container"></div>
                <button class="update-button" id="update-marking-reachability">Update Marking Reachability</button>
            `;

            document.getElementById('property-text').innerHTML = tableContent;
        }

        //Valores de entrada para o calculo de alcançabilidade 
        function createInputForPlaces(places) {
            const inputContainer = document.getElementById('input-container');

            for (const place of places) {
                const placeName = place.name;
                const inputContainerItem = document.createElement('div');
                inputContainerItem.classList.add('input-container-item');
                inputContainer.appendChild(inputContainerItem);
                const inputLabel = document.createElement('label');
                inputLabel.textContent = `${placeName}: `;
                inputLabel.classList.add('input-label');
                inputContainerItem.appendChild(inputLabel);
                const input = document.createElement('input');
                input.type = 'number';
                input.id = `${placeName}-input`;
                input.value = 0; // Definindo o valor inicial como 0
                input.classList.add('input-field');
                inputContainerItem.appendChild(input);
            }
        }

        //Botão Update da função de alcançabilidade
        function addUpdateButton(interpretedTree, petriClass) {
            const updateButton = document.getElementById('update-marking-reachability');
            updateButton.onclick = () => {
                const targetMarking = {};
                const numPlaces = Object.keys(petriClass.places).length;
                for (let i = 0; i < numPlaces; i++) {
                    const placeName = `p${i + 1}`;
                    const inputValue = document.getElementById(`${placeName}-input`).value;
                    targetMarking[placeName] = parseInt(inputValue);
                }
                const markinReachabilityContent = isMarkingReachable(interpretedTree, targetMarking, petriClass);
                document.getElementById('marking-reachability').textContent = markinReachabilityContent;
            };
        }
    }

    //Botão que abre a tela modal das matrizes E,S e C
    BindMatrixButtons() {
        const matrixModal = document.getElementById('matrix-modal');
        const matrixContainer = document.getElementById('matrix-container');

        const handlers = {
            "nav-btn-modal": () => {
                if (!this.editor) return;
                matrixModal.showModal();

                const netData = this.editor.net.getNetData();
                const customFormatNet = ConvertPetriNet(netData);
                const places = customFormatNet.places;
                const transitions = customFormatNet.transitions;
                const petriClass = new PetriClass(places, transitions);
                openMatrixModal(petriClass);
                getMatrices(petriClass);
            },
            "matrix-modal-close": () => {
                matrixModal.close();
            },
            "matrix-close": () => {
                matrixModal.close();
            }
        };

        // Adiciona manipuladores de evento aos botões
        for (const [btnId, handler] of Object.entries(handlers)) {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.onclick = handler;
            } else {
                console.warn(`Botão com ID '${btnId}' não encontrado.`);
            }
        }

        function openMatrixModal(petriClass) {
            const matrices = getMatrices(petriClass);
            setMatrixContent("matrix-c", matrices.C);
            setMatrixContent("matrix-e", matrices.E);
            setMatrixContent("matrix-s", matrices.S);
            matrixModal.showModal();
        }

        function setMatrixContent(elementId, content) {
            const element = document.getElementById(elementId);
            if (element) {
                element.innerHTML = convertMatrixToHTMLTable(content);
            } else {
                console.warn(`Elemento com ID '${elementId}' não encontrado.`);
            }
        }

        function convertMatrixToHTMLTable(matrix) {
            let tableHTML = '<table>';
            for (let i = 0; i < matrix.length; i++) {
                tableHTML += '<tr>';
                for (let j = 0; j < matrix[i].length; j++) {
                    tableHTML += `<td>${matrix[i][j]}</td>`;
                }
                tableHTML += '</tr>';
            }
            tableHTML += '</table>';
            return tableHTML;
        }
    }

    //Botão que abre a tela modal dos invariantes de lugar 
    bindInvariantsButtons() { 
        const invariantModal = document.getElementById('invariant-modal');
        const invariantContainer = document.getElementById('invariant-container');
    
        const handlers = {
            "nav-btn-place": () => {
                if (!this.editor) {
                    console.error("Editor not found.");
                    return;
                }
    
                invariantModal.showModal();
    
                // Chama a rede de petri desenhada em tela
                const netData = this.editor.net.getNetData();

                // Converte a rede de petri para o formato utilizado no render
                const customFormatNet = ConvertPetriNet(netData);

                // Define os lugares e transições para chamar as funções de tratamento e renderização da árvore de alcançabilidade
                const places = customFormatNet.places;
                const transitions = customFormatNet.transitions;
                const petriClass = new PetriClass(places, transitions);
                const {C} = getMatrices(petriClass);
                
                if(places.length===0||transitions.length===0){
                    invariantContainer.innerHTML = '<p>There is no Petri Net for analysis.</p>';
                    return;
                }else{
                        // Chamada para calcular os invariants
                        const invariants = findPlaceInvariants(C);
                        invariantContainer.innerHTML = '';
                    if (invariants.length === 0) {
                        invariantContainer.innerHTML = '<p>No invariants found.</p>';
                        return;
                    }
        
                    const ul = document.createElement('ul');
                    // Remove os marcadores de lista
                    ul.style.listStyle = 'none'; 
        
                    invariants.forEach((invariant, index) => {
                        const li = document.createElement('li');
                        li.style.fontSize = '1.5em'; 
                        li.style.marginBottom = '0.5em'; 
                        li.style.marginRight = '2em';
                        const span = document.createElement('span');
                        span.style.position = 'relative';
                        span.style.top = '0.5em'; 
                        span.style.fontSize = '0.7em'; 
                        span.textContent = `${index + 1}`;
                        li.innerHTML = `<span style="position: relative; ">Z${span.outerHTML}</span>: [${invariant.join(', ')}]`;
                        ul.appendChild(li);
                    });
                    invariantContainer.appendChild(ul);
                }
                
            },
            "invariant-modal-close": () => {
                invariantModal.close();
            },
            "invariant-close": () => {
                invariantModal.close();
            },
        };
    
        for (const [btnId, handler] of Object.entries(handlers)) {
            const btn = document.getElementById(btnId);
            if (!btn) {
                console.error(`Button ${btnId} not found.`);
                continue;
            }
            btn.onclick = handler;
        }
    }

    //Botão que abre a tela modal dos invariantes de transição
    bindInvTransitionButton() {
        const invTransitionModal = document.getElementById('invTransition-modal');
        const invTransitionContainer = document.getElementById('invTransition-container');
    
        const handlers = {
            "nav-btn-transition": () => {
                if (!this.editor) {
                    return;
                }
    
                invTransitionModal.showModal();
    
                // Chama a rede de petri desenhada em tela
                const netData = this.editor.net.getNetData();

                // Converte a rede de petri para o formato utilizado no render
                const customFormatNet = ConvertPetriNet(netData);

                // Define os lugares e transições para chamar as funções de tratamento e renderização da árvore de alcançabilidade
                const places = customFormatNet.places;
                const transitions = customFormatNet.transitions;
                const petriClass = new PetriClass(places, transitions);
                const {C} = getMatrices(petriClass);
    
                // Analisa se realmente existe uma rede de petri para executar as funções
                if(places.length===0||transitions.length===0){
                    invTransitionContainer.innerHTML = '<p>There is no Petri Net for analysis.</p>';
                    return;
                }else{
                    const transitionInv = findTransitionInvariants(C);
    
                    invTransitionContainer.innerHTML = ''; // Limpa o conteúdo anterior
        
                    if (transitionInv.length === 0) {
                        invTransitionContainer.innerHTML = '<p>No invariants found.</p>';
                        return;
                    }
                    
                    // Adiciona os vetores gráficos dos invariantes na modal
                    transitionInv.forEach(inv => {
                        const invRow = document.createElement('p');
                        invRow.textContent = `[${inv.join(' ')}]`;
                        invRow.style.textAlign = 'center';
                        invTransitionContainer.appendChild(invRow);
                    });
                }
            },
            "invTransition-modal-close": () => {
                invTransitionModal.close();
            },
            "invTransition-close": () => {
                invTransitionModal.close();
            },
        };
    
        for (const [btnId, handler] of Object.entries(handlers)) {
            const btn = document.getElementById(btnId);
            if (!btn) {
                console.error(`Button ${btnId} not found.`);
                continue;
            }
            btn.onclick = handler;
        }
    }

    bindSimulationButtons() {
        const handlers = {
            start: () => {
                if (!this.simulator)
                    this.startSimulation();
                this.simulator.start();
            },
            step: () => {
                if (!this.simulator)
                    this.startSimulation();
                this.simulator.step();
            },
            restart: async () => {
                if (!this.simulator)
                    return;
                this.simulator.stop();
                while (!this.simulator.isStopped())
                    await delay(50);
                this.startSimulation();
                this.simulator.start();
            },
            pause: () => {
                if (!this.simulator)
                    return;
                this.simulator.pause();
            },
            stop: async () => {
                if (!this.simulator)
                    return;
                this.simulator.stop();
                while (!this.simulator.isStopped())
                    await delay(50);
                this.simulator = null;
            },
        };
        for (const [cmd, handler] of Object.entries(handlers)) {
            const btn = document.getElementById(`sim-btn-${cmd}`);
            btn.onclick = () => {
                if (!this.editor)
                    return;
                handler();
            };
        }
        const errorModal = document.getElementById("error-modal");
        document.getElementById("close-error-modal").onclick = () => errorModal.close();
    }
    addEditorEventListeners() {
        let movingScreenOffset;
        const handlers = {
            mousedown: (evt) => {
                if (!this.editor)
                    return;
                if (evt.ctrlKey || evt.button === 2) {
                    movingScreenOffset = this.editor.net
                        .getMousePosition(evt, true);
                }
                else if (this.simulator) {
                    this.simulator.eventHandler.mousedown(evt);
                }
                else {
                    this.editor.currentTool.onMouseDown(evt);
                }
            },
            mouseup: (evt) => {
                evt.preventDefault();
                if (!this.editor)
                    return;
                movingScreenOffset = null;
                if (!this.simulator) {
                    this.editor.currentTool.onMouseUp(evt);
                }
            },
            mousemove: (evt) => {
                if (!this.editor)
                    return;
                if (movingScreenOffset) {
                    const mousePos = this.editor.net
                        .getMousePosition(evt, true);
                    this.editor.net.moveScreen(mousePos.sub(movingScreenOffset));
                }
                else if (!this.simulator) {
                    this.editor.currentTool.onMouseMove(evt);
                }
            },
            mouseleave: (evt) => {
                if (!this.editor)
                    return;
                movingScreenOffset = null;
                if (!this.simulator) {
                    this.editor.currentTool.onMouseLeave(evt);
                }
            },
            wheel: (evt) => {
                evt.preventDefault();
                if (!this.editor)
                    return;
                const scale = Math.min(Math.max(.9, 1 + .01 * evt.deltaY), 1.1);
                const mousePos = this.editor.net.getMousePosition(evt);
                this.editor.net.zoom(mousePos, scale);
            }
        };
        const ele = document.getElementById("svg-div");
        for (const [event, handler] of Object.entries(handlers)) {
            ele.addEventListener(event, handler);
        }
        document.body.addEventListener('keydown', (evt) => {
            if (!this.editor)
                return;
            if (evt.target.tagName !== "BODY")
                return;
            if (this.simulator)
                return;
            if (evt.key === 'z' && evt.ctrlKey) {
                this.editor.net.undo();
            }
            else if (evt.key === 'y' && evt.ctrlKey) {
                this.editor.net.redo();
            }
            else
                this.editor.currentTool.onKeyDown(evt);
        });
        document.addEventListener("contextmenu", function (evt) {
            evt.preventDefault();
        }, false);
    }


}
