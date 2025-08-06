
const apiBaseUrl = 'https://localhost:7118/api/pokemon';

document.addEventListener('DOMContentLoaded', () => {

    const pokemonList = document.getElementById('pokemon-list');
    const generationSelector = document.getElementById('generation-selector');
    const nameFilterInput = document.getElementById('nameFilter');
    const speciesFilterSelect = document.getElementById('speciesFilter');
    const abilityModal = new bootstrap.Modal(document.getElementById('abilityModal'));
    const filterBtn = document.getElementById('filter-btn');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const exportBtn = document.getElementById('export-excel-btn'); 
    const emailListBtn = document.getElementById('email-list-btn');
    const detailsContent = document.getElementById('pokemon-common-info');


    // --- Selectores del Panel de Detalles (NUEVA ESTRUCTURA) ---
    const commonInfoContent = document.getElementById('pokemon-common-info');
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const generalContent = document.getElementById('general-tab');
    const statsContent = document.getElementById('stats-tab');
    const evolutionsContent = document.getElementById('evolutions-tab');
    const formsContent = document.getElementById('forms-tab');
    const detailsButtons = document.getElementById('details-buttons');

    // --- Selectores del Modal de Correo ---
    const emailModal = new bootstrap.Modal(document.getElementById('sendEmailModal'));
    const emailForm = document.getElementById('send-email-form');

    // --- Variables de Estado ---
    let currentGeneration = 1;
    let limit = 40;
    let offset = 0;
    let allPokemonsOfGeneration = [];
    let totalPokemonsInGeneration = 0;
    let isLoading = false; 
    

    function applyFilters() {
        const nameFilter = nameFilterInput.value.toLowerCase();
        const typeFilter = speciesFilterSelect.value;
        let filteredPokemons = allPokemonsOfGeneration;

        if (nameFilter) {
            filteredPokemons = filteredPokemons.filter(p => p.name.toLowerCase().includes(nameFilter));
        }
        if (typeFilter !== 'all') {
            filteredPokemons = filteredPokemons.filter(p => p.types.some(t => t.type.name === typeFilter));
        }

        renderPokemonList(filteredPokemons); // Filtra la lista
    }


    // Event listener que se activa al hacer clic en el panel izquierdo
    document.getElementById('left-panel').addEventListener('click', (event) => {
        // Verificamos si el elemento clickeado es una habilidad
        if (event.target.classList.contains('ability-name')) {
            const abilityName = event.target.dataset.abilityName;
            if (abilityName) {
                showAbilityModal(abilityName);
            }
        }
    });
    

    async function loadPokemons(genNumber) {
        // Reiniciamos todo cuando se cambia de generación
        currentGeneration = genNumber;
        offset = 0;
        pokemonList.innerHTML = ''; // Limpiamos la lista
        allPokemonsOfGeneration = [];
        setupGenerationSelector();

        await loadMorePokemons(); // Cargamos el primer lote
    }
    async function loadMorePokemons() {
        // Esta primera línea previene cargas si ya se está cargando o si se completó
        if (isLoading || (offset > 0 && offset >= totalPokemonsInGeneration)) {
            return;
        }

        isLoading = true;
        showLoadingIndicator(true);

        try {
            const response = await fetch(`${apiBaseUrl}/generation/${currentGeneration}?limit=${limit}&offset=${offset}`);
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

            const data = await response.json();
            totalPokemonsInGeneration = data.totalCount;
            allPokemonsOfGeneration.push(...data.pokemons);

            renderPokemonList(data.pokemons, true);
            offset += limit;

            if (offset < totalPokemonsInGeneration) {
                // Llama a esta misma función de nuevo para cargar el siguiente lote
                setTimeout(loadMorePokemons, 100);
            }
        }
        catch (error) {
            console.error('No se pudieron cargar más Pokémon:', error);
        } finally {
            // --- INICIO DE LA CORRECCIÓN ---
            // Se reinicia isLoading después de CADA carga para permitir que la cadena continúe.
            isLoading = false;

            // El indicador de "Cargando..." solo se oculta cuando se han cargado TODOS los Pokémon.
            if (offset >= totalPokemonsInGeneration) {
                showLoadingIndicator(false);
            }
            // --- FIN DE LA CORRECCIÓN ---
        }
    }
    // --- MOSTRAR DETALLES ---

    function showDetails(pokemon) {
        currentPokemon = pokemon;
        
        // Panel superior común
        const bwGif = pokemon.sprites?.versions?.['generation-v']?.['black-white']?.animated?.front_default;
        const imageUrl = bwGif
            || pokemon.sprites?.other?.['official-artwork']?.front_default
            || pokemon.sprites?.front_default
            || '';
        const typesHtml = renderTypeBadges(pokemon.types);

        detailsContent.innerHTML = `
            <img src="${imageUrl}" alt="${pokemon.name}">
            <h3 class="text-capitalize">${pokemon.name} (#${pokemon.id})</h3>
            <p><strong>Tipo:</strong> ${typesHtml}</p>
        `;

        playCry(pokemon.name);
        // Renderiza cada pestaña
        renderGeneralTab(pokemon);
        renderStatsTab(pokemon);
        renderFormsTab(pokemon);
        loadAndRenderEvolutionsTab(pokemon.id);

        // Botón de correo
        detailsButtons.innerHTML = '';
        const sendEmailBtn = document.createElement('button');
        sendEmailBtn.className = 'btn-image-style';
        sendEmailBtn.textContent = 'Enviar a Correo';
        sendEmailBtn.addEventListener('click', () => {
            const typesString = pokemon.types.map(t => t.type.name).join(', ');
            prepareEmailModal({
                pokemonName: pokemon.name,
                pokemonId: pokemon.id,
                pokemonTypes: typesString,
                pokemonImage: imageUrl,
                subject: `Detalles de ${pokemon.name}`
            });
            emailModal.show();
        });
        detailsButtons.appendChild(sendEmailBtn);
    }


    function renderTypeBadges(types) {
        if (!types) return ''; // Devuelve un string vacío si no hay tipos

        return types.map(t => {
            const typeName = t.type.name;
            // La lógica de getTypeIcon ahora está aquí directamente:
            const iconUrl = `assets/types/${typeName}.png`;

            return `<span class="type-badge">
                    <img src="${iconUrl}" alt="${typeName}" style="height:24px; vertical-align:middle;">
                </span>`;
        }).join(' ');
    }
   
    //Convierte la altura de decímetros a metros y pies / pulgadas.
    function formatHeight(decimetres) {
        const meters = decimetres / 10;
        const totalInches = meters * 39.3701;
        const feet = Math.floor(totalInches / 12);
        const inches = Math.round(totalInches % 12);
        return `${meters.toFixed(1)}m (${feet}" ${inches}')`;
    }

  // Convierte el peso de hectogramos a kilogramos y libras.

    function formatWeight(hectograms) {
        const kg = hectograms / 10;
        const lbs = kg * 2.20462;
        return `${kg.toFixed(1)}kg (${lbs.toFixed(1)}lbs.)`;
    }

    async function showAbilityModal(abilityName) {
        const modalTitle = document.getElementById('abilityModalLabel');
        const modalBody = document.getElementById('abilityModalBody');

        // Mostramos un mensaje de carga
        modalTitle.textContent = abilityName.split('-').join(' ');
        modalBody.innerHTML = '<p>Buscando descripción...</p>';
        abilityModal.show();

        try {
            const response = await fetch(`${apiBaseUrl}/ability/${abilityName}`);
            if (!response.ok) throw new Error('No se encontró la descripción.');

            const data = await response.json();
            modalBody.innerHTML = `<p>${data.description}</p>`;
        } catch (error) {
            modalBody.innerHTML = `<p>${error.message}</p>`;
        }
    }

    function renderStatsTab(pokemon) {
        // 1. Calculamos el total de las estadísticas primero
        const totalStats = pokemon.stats.reduce((sum, stat) => sum + stat.base_stat, 0);
        let html = '<div class="stats-container">';
        if (!pokemon.stats || pokemon.stats.length === 0) {
            statsContent.innerHTML = '<p>No hay estadísticas disponibles.</p>';
            return;
        }

        // 2. Creamos las filas para cada estadística (como antes)
        pokemon.stats.forEach(stat => {
            // NOMBRE DEL STAT
            const statName = stat.statInfo?.name?.replace('special-', 'Sp. ') ||
                stat.stat?.name?.replace('special-', 'Sp. ') ||
                '???';
            // VALOR DEL STAT
            const statValue = stat.base_stat ?? 0; 
            const barWidth = Math.min(100, (statValue / 200) * 100);

            html += `
            <div class="stat-name">${statName}</div>
            <div class="stat-bar-container">
                <div class="stat-bar" style="width: ${barWidth}%;">${statValue}</div>
            </div>`;
        });

        // 3. Añadimos la nueva fila para el total al final
        html += `
    <div class="stat-name total-stat">Total</div>
    <div class="total-stat-value">${totalStats}</div>
`;
        statsContent.innerHTML = html;
    }


// --- LÓGICA DE LAS PESTAÑAS ---
tabLinks.forEach(tab => {
    tab.addEventListener('click', () => {
        const targetTab = document.getElementById(tab.dataset.tab);
        tabLinks.forEach(link => link.classList.remove('active'));
        tabPanes.forEach(pane => pane.classList.remove('active'));
        tab.classList.add('active');
        targetTab.classList.add('active');
    });
});

// --- FUNCIONES DE RENDERIZADO ---
    function resetDetailsView() {
        commonInfoContent.innerHTML = '<p class="placeholder-text">Selecciona un Pokémon...</p>';
        generalContent.innerHTML = '';
        statsContent.innerHTML = '';
        evolutionsContent.innerHTML = '';
        formsContent.innerHTML = '';
        detailsButtons.innerHTML = '';

        // Asegurarse de que la pestaña "General" esté activa por defecto
        tabLinks.forEach(link => link.classList.remove('active'));
        tabPanes.forEach(pane => pane.classList.remove('active'));
        document.querySelector('.tab-link[data-tab="general-tab"]').classList.add('active');
        document.getElementById('general-tab').classList.add('active');
    }

    function renderGeneralTab(pokemon) {
        const formattedHeight = formatHeight(pokemon.height);
        const formattedWeight = formatWeight(pokemon.weight);

        // Habilidades
        let abilitiesHtml = pokemon.abilities.map(a => {
            const abilityName = a.ability.name.split('-').join(' ');
            const hiddenClass = a.is_hidden ? 'is-hidden-ability' : '';
            const isHidden = a.is_hidden ? '<span class="hidden-ability-label">(Oculta)</span>' : '';
            // Añadimos data-ability-name para saber en qué habilidad se hizo clic
            return `<div class="ability-item">
                    <span class="ability-name ${hiddenClass}" data-ability-name="${a.ability.name}">${abilityName}</span>
                    ${isHidden}
                </div>`;
        }).join('');

        const eggGroupsHtml = pokemon.eggGroups.map(eg => eg.name).join(', ');


        generalContent.innerHTML = `
        <p class="description-text">${pokemon.description || 'Descripción no disponible.'}</p>
        <div class="stats-grid">
             <div class="stat-item"><strong>Altura</strong></div>
             <div class="stat-value">${formattedHeight}</div>
             <div class="stat-item"><strong>Peso</strong></div>
             <div class="stat-value">${formattedWeight}</div>
             <div class="stat-item"><strong>Habilidades</strong></div>
             <div class="stat-value">${abilitiesHtml}</div>
             <div class="stat-item"><strong>Grupos Huevo</strong></div>
             <div class="stat-value text-capitalize">${eggGroupsHtml}</div>
        </div>
    `;
    
    }

    async function loadAndRenderEvolutionsTab(pokemonId) {
        evolutionsContent.innerHTML = '<p class="placeholder-text">Cargando evoluciones...</p>';
        try {
            const response = await fetch(`${apiBaseUrl}/evolution-chain/${pokemonId}`);
            if (!response.ok) throw new Error('Error al cargar la cadena de evolución.');

            const evolutionPaths = await response.json(); // Ahora es un array de arrays

            if (!Array.isArray(evolutionPaths) || evolutionPaths.length === 0) {
                evolutionsContent.innerHTML = '<p class="placeholder-text">Este Pokémon no tiene evoluciones.</p>';
                return;
            }

            let html = '<div class="evolutions-container">';

            // Iteramos sobre cada "camino" de evolución
            evolutionPaths.forEach(path => {
                // Cada camino es una fila horizontal
                html += '<div class="evolution-path">';

                path.forEach((step, index) => {
                    if (step && step.pokemon) {
                        const p = step.pokemon;
                        const types = renderTypeBadges(p.types);

                        // Renderiza la etapa actual del Pokémon
                        html += `
                    <div class="evolution-stage">
                        <img src="${p.sprites.front_default || ''}" alt="${p.name}">
                        <p class="evo-name">${p.name}</p>
                        <div class="evo-types">${types}</div>
                    </div>
                    `;

                        // Si NO es el último, renderiza la flecha y el requisito para el SIGUIENTE
                        if (index < path.length - 1) {
                            const nextStep = path[index + 1];
                            if (nextStep && nextStep.evolutionDetail) {
                                html += `<div class="evolution-arrow">
                                        <span class="arrow-symbol">→</span>
                                        ${renderEvolutionRequirement(nextStep.evolutionDetail)}
                                     </div>`;
                            }
                        }
                    }
                });
                html += '</div>'; // Cierra la fila del camino
            });

            html += '</div>'; // Cierra el contenedor principal
            evolutionsContent.innerHTML = html;

        } catch (error) {
            evolutionsContent.innerHTML = `<p class="placeholder-text">${error.message}</p>`;
        }
    }
    function renderEvolutionRequirement(detail) {
        if (!detail || !detail.trigger) return '';

        const triggerName = detail.trigger.name;

        if (triggerName === "level-up") {
            // AMISTAD + NIVEL
            if (detail.min_happiness != null && detail.min_level != null) {
                return `<span class="evo-requirement">Amistad ${detail.min_happiness} + Nivel ${detail.min_level}</span>`;
            }
            // Solo AMISTAD
            if (detail.min_happiness != null) {
                return `<span class="evo-requirement">Amistad  ${detail.min_happiness} +  Nivel</span>`;
            }
            // Solo NIVEL
            if (detail.min_level != null) {
                return `<span class="evo-requirement">Nivel ${detail.min_level}</span>`;
            }
            // Subida sin requisito visible
            return `<span class="evo-requirement">Subir Nivel</span>`;
        }

        if (triggerName === "use-item" && detail.item) {
            const itemName = detail.item.name
                .split('-')
                .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ');
            const iconUrl = getItemIcon(detail.item.name);

            return `<span class="evo-requirement">
                    <img src="${iconUrl}" alt="${itemName}" style="height:24px; vertical-align:middle; margin-right:5px;">
                    ${itemName}
                </span>`;
        }

        if (triggerName === "trade") {
            return `<span class="evo-requirement">Intercambio</span>`;
        }

        // Otros triggers
        const cleanTrigger = triggerName.replace('-', ' ');
        return `<span class="evo-requirement" style="text-transform: capitalize;">${cleanTrigger}</span>`;
    }
    
    function getItemIcon(itemName) {
        const formattedName = itemName.replace(/-/g, '').toUpperCase();
        return `assets/items/${formattedName}.png`;
    }

    function renderPokemonList(pokemonsToRender, append = false) {
        if (!append) {
            pokemonList.innerHTML = '';
        }
        if (pokemonsToRender.length === 0 && !append) {
            pokemonList.innerHTML = '<li class="placeholder-text">No se encontraron Pokémon.</li>';
            return;
        }

        pokemonsToRender.forEach(pokemon => {
            const listItem = document.createElement('li');
            listItem.addEventListener('click', () => showDetails(pokemon)); // Asumiendo que tienes una función showDetails
            listItem.innerHTML = `
                <div class="pokemon-info-left">
                    <img src="${pokemon.sprites?.front_default || ''}" alt="${pokemon.name}">
                    <span>No. ${String(pokemon.id).padStart(3, '0')}</span>
                </div>
                <span class="pokemon-name">${pokemon.name}</span>`;
            pokemonList.appendChild(listItem);
        });
    }
    // --- MANEJADOR DEL EVENTO SCROLL ---

    

    function showLoadingIndicator(show) {
        // Primero, siempre busca y elimina cualquier indicador existente.
        // Esto es clave para reposicionarlo al final en cada carga.
        const existingIndicator = document.getElementById('loading-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        // Si `show` es true, crea y añade un nuevo indicador al final de la lista.
        if (show) {
            const indicator = document.createElement('li');
            indicator.id = 'loading-indicator';
            indicator.className = 'placeholder-text';
            indicator.style.justifyContent = 'center'; // Para centrar el texto
            indicator.textContent = 'Cargando Pokémon...';
            pokemonList.appendChild(indicator);
        }
    }
    function renderFormsTab(pokemon) {
        const sprites = pokemon.sprites;
        let forms = []; // Iniciaremos un array vacío

        // Primero, verificamos si el Pokémon tiene una forma femenina
        if (sprites.front_female) {
            // Si la tiene, usamos los símbolos de género para las etiquetas
            forms = [
                { name: '♂', url: sprites.front_default },
                { name: '♂ Shiny', url: sprites.front_shiny },
                { name: '♀', url: sprites.front_female },
                { name: '♀ Shiny', url: sprites.front_shiny_female }
            ];
        } else {
            // Si no tiene forma femenina, usamos las etiquetas estándar
            forms = [
                { name: 'Normal', url: sprites.front_default },
                { name: 'Shiny', url: sprites.front_shiny }
            ];
        }

        // El resto de la función que crea el HTML no necesita cambios
        let html = '<div class="forms-container">';
        forms.forEach(form => {
            // Solo mostramos la forma si la imagen (URL) existe
            if (form.url) {
                html += `
                <div class="form-item">
                    <img src="${form.url}" alt="${form.name}">
                    <p>${form.name}</p>
                </div>`;
            }
        });
        html += '</div>';
        formsContent.innerHTML = html;
    }

    function setupGenerationSelector() {
        generationSelector.innerHTML = '';
        const totalGenerations = 9;
        for (let i = 1; i <= totalGenerations; i++) {
            const genButton = document.createElement('button');
            genButton.textContent = `Gen ${i}`;
            genButton.dataset.generation = i;
            genButton.className = 'btn-gen';
            if (i === currentGeneration) genButton.classList.add('active');
            genButton.addEventListener('click', () => loadPokemons(i));
            generationSelector.appendChild(genButton);
        }
    }
    
    function playCry(pokemonName) {
        // Usar el nombre en minúsculas
        const audioUrl = `https://play.pokemonshowdown.com/audio/cries/${pokemonName.toLowerCase()}.ogg`;
        const audio = new Audio(audioUrl);
        audio.volume = 0.7; // Puedes ajustar el volumen si quieres
        audio.play();
    }

async function loadPokemonTypes() {
    try {
        const response = await fetch(`${apiBaseUrl}/types`);
        const types = await response.json();
        speciesFilterSelect.innerHTML = '<option value="all">Todas</option>';
        types.forEach(type => {
            const option = document.createElement('option');
            option.value = type.name;
            option.textContent = type.name.charAt(0).toUpperCase() + type.name.slice(1);
            speciesFilterSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error al cargar los tipos de Pokémon:', error);
    }
}

    // --- LÓGICA DEL REPRODUCTOR DE MÚSICA ---

    // 1. Define tu lista de canciones (CAMBIA LAS RUTAS)
    const songList = [
        'assets/music/ruta_1.mp3',
        'assets/music/Red_Blue_Ending.mp3',
        'assets/music/ruta_1.mp3',
        'assets/music/pueblo_paleta.mp3',
        'assets/music/Lavender.mp3'
    ];

    // 2. Selecciona los elementos del DOM
    const audioPlayer = document.getElementById('audio-player');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const prevTrackBtn = document.getElementById('prev-track-btn');
    const nextTrackBtn = document.getElementById('next-track-btn');

    let currentTrackIndex = 0; // Para saber qué canción está sonando

    // 3. Función para cargar y reproducir una canción
    function loadTrack(trackIndex) {
        audioPlayer.src = songList[trackIndex];
        audioPlayer.play();
        playPauseBtn.classList.add('playing'); // Muestra el ícono de pausa
    }

    // 4. Lógica para el botón de Play/Pausa
    playPauseBtn.addEventListener('click', () => {
        if (audioPlayer.paused) {
            audioPlayer.play();
            playPauseBtn.classList.add('playing');
        } else {
            audioPlayer.pause();
            playPauseBtn.classList.remove('playing');
        }
    });

    // 5. Lógica para el botón de Siguiente
    nextTrackBtn.addEventListener('click', () => {
        currentTrackIndex = (currentTrackIndex + 1) % songList.length; // Va a la siguiente y vuelve al inicio si es la última
        loadTrack(currentTrackIndex);
    });

    // 6. Lógica para el botón de Anterior
    prevTrackBtn.addEventListener('click', () => {
        currentTrackIndex = (currentTrackIndex - 1 + songList.length) % songList.length; // Va a la anterior y a la última si es la primera
        loadTrack(currentTrackIndex);
    });

    // 7. Carga la primera canción al iniciar (pero no la reproduce)
    audioPlayer.src = songList[currentTrackIndex];

    // --- LÓGICA DE CORREO ---

    function prepareEmailModal(data = {}) {
        emailForm.reset(); // Limpia el formulario
        // Rellena los campos del formulario con los datos recibidos
        emailForm.querySelector('[name="subject"]').value = data.subject || 'Lista de Pokémon';
        emailForm.querySelector('[name="pokemonName"]').value = data.pokemonName || '';
        emailForm.querySelector('[name="pokemonId"]').value = data.pokemonId || '';
        emailForm.querySelector('[name="pokemonTypes"]').value = data.pokemonTypes || '';
        emailForm.querySelector('[name="pokemonImage"]').value = data.pokemonImage || '';
    }

    emailForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitButton = emailForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Enviando...';

        const formData = new FormData(emailForm);
        const requestData = {
            emailAddress: formData.get('emailAddress'),
            subject: formData.get('subject'),
            body: formData.get('body'),
            pokemonName: formData.get('pokemonName'),
            pokemonId: parseInt(formData.get('pokemonId')) || 0,
            pokemonTypes: formData.get('pokemonTypes'),
            pokemonImage: formData.get('pokemonImage'),
            nameFilter: nameFilterInput.value,
            speciesFilter: speciesFilterSelect.value,
        };

        try {
            const response = await fetch(`${apiBaseUrl}/send-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            alert('¡Correo enviado con éxito!');
            emailModal.hide();
        } catch (error) {
            alert(`Error al enviar correo: ${error.message}`);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Enviar';
        }
    }
    );

    // --- MANEJADORES DE EVENTOS ---

    filterBtn.addEventListener('click', applyFilters);

    clearFiltersBtn.addEventListener('click', () => {
        nameFilterInput.value = '';
        speciesFilterSelect.value = 'all';
        loadPokemons(currentGeneration); 

    });

    exportBtn.addEventListener('click', () => {
        const name = nameFilterInput.value;
        const species = speciesFilterSelect.value;
        window.location.href = `${apiBaseUrl}/export?nameFilter=${name}&speciesFilter=${species}`;
    });

    emailListBtn.addEventListener('click', () => {
        prepareEmailModal({ subject: 'Lista filtrada de Pokémon' });
    });

  


    // --- Carga Inicial ---
    loadPokemonTypes();
    loadPokemons(currentGeneration);

});
