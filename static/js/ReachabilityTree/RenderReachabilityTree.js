

function renderReachabilityTree(interpretedTree) {
    const width = 2000;
    const height = 2000;
    const margin = { top: 40, right: 20, bottom: 20, left: 20 };
    let angle = 0;


    // Criação do contêiner SVG para o gráfico
    const svg = d3
        .select("#tree-container")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const nodeMap = new Map(); // Mapeia os nós já plotados pelo estado (state)

    function renderTree(root, index) {
        // Configuração do layout da árvore
        const treeLayout = d3.tree().size([2000, 200]);

        // Criando a hierarquia da árvore
        const hierarchy = d3.hierarchy(root);

        // Aplicando o layout da árvore à hierarquia
        const treeData = treeLayout(hierarchy);

        // Adicionando os nós da árvore na tela
        const nodes = svg
            .selectAll(`.node-${index}`)
            .data(treeData.descendants())
            .enter()
            .filter((d) => d.data.state !== "Deadlock")
            .append("g")
            .attr("class", `node node-${index}`)
            .attr("transform", (d) => {
                //Define uma chave para o node para facilitar a busca na arvore e verificar a repetição
                const key = JSON.stringify(d.data.state);
                // Verifica se o nó já foi renderizado anteriormente
                const existingNode = nodeMap.get(key);
                //Verifica se o node possue filhos
                const hasChildren = d.children && d.children.length > 0;
                //Verifica se o node existe e possui filhos, se sim ele é um node já plotado e o novo node deve sobrepo-lo
                if (existingNode && hasChildren) {
                    d.x = existingNode.x;
                    d.y = existingNode.y;

                } else {

                    /*let distance = 200; // Distância fixa

                    // Ajusta as coordenadas em relação ao pai
                    if (d.parent && d.parent.children) {
                        const numberOfChildren = d.parent.children.length;
                        const angleOffset = 180 / (numberOfChildren + 1);
                        if (numberOfChildren >= 3) {
                            distance = distance * 2;
                        }
                        angle += (angleOffset * Math.PI) / 180;
                        d.x = d.parent.x + distance * Math.cos(angle);
                        d.y = d.parent.y + distance * Math.sin(angle);
                    }
                }*/
                    //Função para definir a posição dos nodes a serem plotados em tela 
                    let distance = 200; // Distância fixa

                    if (d.parent && d.parent.children) {
                        const parentChildren = d.parent.children;
                        const numberOfChildren = parentChildren.length;
                        const angleOffset = 180 / (numberOfChildren + 1);

                        if (numberOfChildren >= 3) {
                            distance = distance * 3;
                        }

                        // Função para verificar se há sobreposição com qualquer nó já plotado
                        const isOverlapWithExistingNodes = (x, y) => {
                            for (const node of nodeMap.values()) {
                                const dx = x - node.x;
                                const dy = y - node.y;
                                const distanceBetweenNodes = Math.sqrt(dx * dx + dy * dy);

                                if (distanceBetweenNodes < 100) {
                                    return true;  // Retorna true se houver sobreposição
                                }
                            }
                            return false;  // Retorna false se não houver sobreposição
                        };

                        let attempts = 0;
                        const maxAttempts = 10; // Limite de tentativas para evitar loops infinitos

                        // Loop até encontrar uma distância sem sobreposição ou atingir o limite de tentativas
                        while (isOverlapWithExistingNodes(d.parent.x + distance * Math.cos(angle), d.parent.y + distance * Math.sin(angle)) && attempts < maxAttempts) {
                            // Se houver sobreposição, aumenta a distância
                            distance += 100;
                            attempts++;
                        }
                        // Calcula as coordenadas finais
                        angle += (angleOffset * Math.PI) / 180;
                        d.x = d.parent.x + distance * Math.cos(angle);
                        d.y = d.parent.y + distance * Math.sin(angle);
                    }
                }

                nodeMap.set(key, d); // Mapeia o nó pelo estado (state)
                return `translate(${d.x},${d.y})`;
            });

        // Mapear os nós pelo estado (state)
        treeData.descendants().forEach((d) => {
            const key = JSON.stringify(d.data.state);
            nodeMap.set(key, d);
        });

        //Define o formato do nó no caso é um circul de cor branca sem bordas
        nodes
            .append("circle")
            .attr("r", 28)
            .style("stroke", "steelblue")
            .attr("cx", 0) // Define o centro do círculo
            .attr("cy", 0) // Define o centro do círculo
            .style("fill", "#fff")
            .style("stroke-width", "0px");

        // Adicionando etiquetas de texto contendo as marcações aos nós
        const textNodes = nodes
            .append("text")
            .attr("dy", 7.5)
            .attr("x", 0)
            .attr("y", 0)

            .style("text-anchor", "middle")
            .style("font-size", "25px")
            .style("fill", "#000")

            .text((d) => {
                // Verifica se o nó já foi renderizado anteriormente
                const key = JSON.stringify(d.data.state);
                const existingNode = nodeMap.get(key);
                const hasChildren = d.children && d.children.length > 0;

                // Adiciona o texto apenas se o nó não foi renderizado anteriormente
                if (existingNode && hasChildren) {
                    return `${JSON.stringify(d.data.id)}`;
                }

                return "";

            });

        // Adicionando as arestas (linhas) entre os nós
        //Definição da seta em SVG
        svg
            .append("defs")
            .append("marker")
            .attr("id", "arrowhead")
            .attr("viewBox", "-0 -5 10 10")
            .attr("refX", 18)
            .attr("refY", 0)
            .attr("orient", "auto")
            .attr("markerWidth", 10)
            .attr("markerHeight", 10)
            .attr("xoverflow", "visible")
            .append("svg:path")
            .attr("d", "M 0,-5 L 10 ,0 L 0,5")
            .attr("fill", "#000")
            .style("stroke", "none");

        //Definição do grupo que vai ser plotado dos links
        const linkGroups = svg
            .selectAll(`.link-${index}`)
            .data(treeData.links())
            .enter()
            .filter(
                (d) =>
                    d.source.data.state !== "Deadlock" &&
                    d.target.data.state !== "Deadlock" // Filtra links com nós "Deadlock"
            )
            .append("g")
            .attr("class", `link link-${index}`);

        // Adiciona a linha ao grupo
        linkGroups
            .append("line")
            .attr("x1", (d) => {
                const sourceKey = JSON.stringify(d.source.data.state);
                const sourceNode = nodeMap.get(sourceKey);
                return sourceNode ? sourceNode.x : d.x;
            })
            .attr("y1", (d) => d.source.y + 30)
            .attr("x2", (d) => d.target.x)
            .attr("y2", (d) => d.target.y)
            .style("stroke-width", 3) // Defina a largura da linha como 3 (ou o valor desejado)
            .attr("marker-end", "url(#arrowhead)"); // Adiciona a seta ao final do link

        // Adiciona o texto no meio da seta.
        linkGroups
            .append("text")
            .attr("x", (d) => (d.source.x + d.target.x) / 2)
            .attr("y", (d) => (d.source.y + d.target.y) / 2)
            .attr("dy", -10)
            .attr("dx", (d) => {
                if ((angle * (180 / Math.PI)) == 90) {
                    //console.log((angle * (180 / Math.PI)))
                    return d.x = 20;
                }
            })
            .style("text-anchor", "middle")
            .style("font-size", "25px")
            .style("fill", "#000")
            .text(
                (d) =>
                    d.target.data.transition ? d.target.data.transition : ""

            );


    }
    //Força uma repetição para plotar todos os nós da arvore e zerando o angulo de referência toda vez que uma sequencia de filhos termina
    interpretedTree.forEach((root, index) => {
        renderTree(root, index);
        angle = 0;
    });
}

export { renderReachabilityTree }
