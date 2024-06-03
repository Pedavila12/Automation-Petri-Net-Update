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
//import { PetriAndProperties } from "./ReachabilityTree/PetriNetAndProperties.js";
import { PetriClass } from "./ReachabilityTree/PetriNetAndProperties.js";
import { reachabilityTree } from "./ReachabilityTree/PetriNetAndProperties.js";
import { interpretReachabilityTree } from "./ReachabilityTree/PetriNetAndProperties.js";
import { isBinaryAndSafe } from "./ReachabilityTree/PetriNetAndProperties.js";
import { isConservative } from "./ReachabilityTree/PetriNetAndProperties.js";
import { isReversible } from "./ReachabilityTree/PetriNetAndProperties.js";
import { getMatrices } from "./ReachabilityTree/PetriNetAndProperties.js";
//import { findPlaceInvariants } from "./ReachabilityTree/PetriNetAndProperties.js";
import { isMarkingReachable } from "./ReachabilityTree/PetriNetAndProperties.js";
import { renderReachabilityTree } from "./ReachabilityTree//RenderReachabilityTree.js"
//import { teste } from "./Teste2.js";
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
    //Botão para abrir o modal
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
                const initialState = Object.fromEntries(
                    places.map((place) => [place.name, place.marking])
                );
                const tree = reachabilityTree(petriClass, initialState);
                const interpretedTree = interpretReachabilityTree(tree);
                renderReachabilityTree(interpretedTree);
                //Exemplo de uso da propriedade de segurança ou binária
                isBinaryAndSafe(petriClass);
                //Exemplo de uso da propriedade de conservação
                isConservative(interpretedTree);
                //Exemplo de uso da propriedade de reversibilidade
                isReversible(petriClass);
                //Exemplo de uso da propriedade de limitação
                petriClass.limitOfPetriNet();
                //Exemplo de uso da propriedade de alcançabilidade
                const targetMarking = { 'p1': 0, 'p2': 0, 'p3': 0, 'p4': 1, 'p5': 1, 'p6': 1 };
                const isReachable = isMarkingReachable(interpretedTree, targetMarking);
                if (isReachable) {
                    console.log("A Marcação é alçavel.");
                } else {
                    console.log("Marcação não alcançável a partir da árvore de alcance.");
                }
                //exemplo de utilização da função que retorna os invariantes de lugar
                //const { C, E, S } = getMatrices(petriClass);
                //const invariants = findPlaceInvariants(C);
                //console.log("Invariantes de Lugar:", invariants);
                /*console.log('Matriz C:');
                console.log(C);
                console.log('Matriz E:');
                console.log(E);
                console.log('Matriz S:');
                console.log(S);
                
                const isReachable = isMarkingReachable(petriClass, targetMarking);
                console.log(`A marcação é alcançável: ${isReachable}`);*/

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

    // bindPropertiesButtons() {
    //     const propriertyModal = document
    //         .getElementById('property-modal');
    //     const propertyContainer = document.getElementById('property-container');
    //     const handlers = {
    //         "nav-btn-property": () => {
    //             // if (!this.editor)
    //             //     return;
    //             propertyContainer.innerHTML = '';
    //             propriertyModal.showModal();

    //             document.getElementById('select-property-safety')
    //                 .onclick = () => console.log("Teste2");
    //             document.getElementById('select-property-boundedness')
    //                 .onclick = this.close;
    //             document.getElementById('select-property-conservation')
    //                 .onclick = this.close;
    //             document.getElementById('select-property-reversibility')
    //                 .onclick = () => this.save();
    //             document.getElementById('select-property-markin-reachability')
    //                 .onclick = () => this.save();

    //             // const netData = this.editor.net.getNetData();
    //             // const customFormatNet = ConvertPetriNet(netData);

    //             // const places = customFormatNet.places;
    //             // const transitions = customFormatNet.transitions;
    //             // const petriClass = new PetriClass(places, transitions);
    //             // const initialState = Object.fromEntries(
    //             //     places.map((place) => [place.name, place.marking])
    //             // );
    //             // const tree = reachabilityTree(petriClass, initialState);
    //             // const interpretedTree = interpretReachabilityTree(tree);

    //             // isBinaryAndSafe(petriClass);
    //         },
    //         "property-modal-close": () => {
    //             propriertyModal.close();
    //         },
    //         "property-close": () => {
    //             propriertyModal.close();
    //         },
    //     };
    //     for (const [btnId, handler] of Object.entries(handlers)) {
    //         const btn = document.getElementById(btnId);
    //         btn.onclick = handler;
    //     }
    // }

    bindPropertiesButtons() {
        const propriertyModal = document.getElementById('property-modal');
        const propertyContainer = document.getElementById('property-container');
        
        const handlers = {
            "nav-btn-property": () => {
                propertyContainer.innerHTML = '';
                propriertyModal.showModal();
    
                if (!this.editor)
                    return;
    
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
    
                // Atualizando o conteúdo da modal para cada clique
                updateContent("select-property-safety", isBinaryAndSafe(petriClass));
                updateContent("select-property-boundedness", getContentForBoundedness());
                updateContent("select-property-conservation", isConservative(interpretedTree,petriClass));
                updateContent("select-property-reversibility", isReversible(petriClass));
                updateContent("select-property-markin-reachability", getContentForMarkinReachability());
            },
            "property-modal-close": () => {
                propriertyModal.close();
                resetPropertyContainer();
            },
            "property-close": () => {
                propriertyModal.close();
                resetPropertyContainer();
            },
        };
    
        // Adiciona manipuladores de evento aos botões
        for (const [btnId, handler] of Object.entries(handlers)) {
            const btn = document.getElementById(btnId);
            btn.onclick = handler;
        }
    
        // Função para atualizar o conteúdo na modal
        function updateContent(btnId, content) {
            document.getElementById(btnId).onclick = () => {
                document.getElementById('property-text').innerText = content;
            };
        }
    
        // Funções para obter o conteúdo
        function getContentForBoundedness() {
            return "Conteúdo para Limitation";
        }

    
        function getContentForMarkinReachability() {
            return "Conteúdo para markin reachability";
        }
        // Função para redefinir o conteúdo do propertyContainer
    function resetPropertyContainer() {
        propertyContainer.innerHTML = 'Select the desired property'; // Substitua por seu conteúdo padrão
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
                console.log(evt);
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
            console.log();
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
