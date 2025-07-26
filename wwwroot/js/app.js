const apiBaseUrl = 'https://localhost:7118/api'; 

document.addEventListener('DOMContentLoaded', () => {

    const apiBaseUrl = 'https://localhost:7118/api/pokemon';

    const pokemonList = document.getElementById('pokemon-list');
    const generationSelector = document.getElementById('generation-selector');
    const nameFilterInput = document.getElementById('nameFilter');
    const speciesFilterSelect = document.getElementById('speciesFilter');

    // Botones
    const filterBtn = document.getElementById('filter-btn');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const exportBtn = document.getElementById('export-excel-btn');
    const emailListBtn = document.getElementById('email-list-btn');

    // Panel de detalles
    const detailsContent = document.getElementById('pokemon-details-content');
    const detailsButtons = document.getElementById('details-buttons');

    // Modal y formulario de correo
    const emailModal = new bootstrap.Modal(document.getElementById('sendEmailModal'));
    const emailForm = document.getElementById('send-email-form');

    let currentGeneration = 1;
    let currentPage = 1;
    let currentPokemons = [];
    let selectedPokemonLi = null;

    let allPokemonsOfGeneration = []; // Almacenará todos los pokémon de la generación actual

    async function loadPokemons(genNumber = 1) {
        currentGeneration = genNumber;
        pokemonList.innerHTML = '<li class="placeholder-text" style="justify-content: center;">Cargando Pokemon...</li>';
        detailsContent.innerHTML = '<p class="placeholder-text">Selecciona un Pokémon de la lista...</p>';
        detailsButtons.innerHTML = '';
        setupGenerationSelector();

        try {
            const response = await fetch(`${apiBaseUrl}/generation/${genNumber}`);
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

            allPokemonsOfGeneration = await response.json();
            applyFilters();

        } catch (error) {
            console.error('No se pudieron cargar los Pokémon:', error);
            pokemonList.innerHTML = `<li class="placeholder-text" style="color: red; justify-content: center;">${error.message}</li>`;
        }
    }

    function renderPokemonList(pokemonsToRender) {
        pokemonList.innerHTML = '';
        if (pokemonsToRender.length === 0) {
            pokemonList.innerHTML = '<li class="placeholder-text" style="justify-content: center;">No se encontraron Pokémon con esos filtros.</li>';
            return;
        }

        pokemonsToRender.forEach(pokemon => {
            const listItem = document.createElement('li');
            listItem.dataset.pokemonName = pokemon.name;
            listItem.innerHTML = `
                <div class="pokemon-info-left">
                    <img src="${pokemon.sprites?.front_default || ''}" alt="${pokemon.name}">
                    <span>No. ${String(pokemon.id).padStart(3, '0')}</span>
                </div>
                <span class="pokemon-name">${pokemon.name}</span>
            `;

            listItem.addEventListener('click', () => {
                showDetails(pokemon);
                playCry(pokemon.name); 
                if (selectedPokemonLi) selectedPokemonLi.classList.remove('selected');
                listItem.classList.add('selected');
                selectedPokemonLi = listItem;
            });
            pokemonList.appendChild(listItem);
        });
    }

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
        renderPokemonList(filteredPokemons);
    }

    function setupGenerationSelector() {
        generationSelector.innerHTML = '';
        const totalGenerations = 9;
        for (let i = 1; i <= totalGenerations; i++) {
            const genButton = document.createElement('button');
            genButton.textContent = `Gen ${i}`;
            genButton.dataset.generation = i;
            genButton.className = 'btn-gen';
            if (i === currentGeneration) {
                genButton.classList.add('active');
            }
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


    // --- MOSTRAR DETALLES ---

    function showDetails(pokemon) {
        
        // Intenta obtener el gif animado de Black/White
        const bwGif = pokemon.sprites?.versions?.['generation-v']?.['black-white']?.animated?.front_default;
        // Si no existe, usa el sprite oficial/artwork o el default
        const imageUrl = bwGif
            || pokemon.sprites?.other?.['official-artwork']?.front_default
            || pokemon.sprites?.front_default
            || '';
        const typesString = pokemon.types.map(t => t.type.name).join(', ');
        const description = pokemon.description || 'Descripción no disponible.';


        // Se construye el HTML para el panel de detalles
        detailsContent.innerHTML = `
        <img src="${imageUrl}" alt="${pokemon.name}" style="image-rendering: pixelated; height: 160px; width: auto;">
        <h3 class="text-capitalize">${pokemon.name} (#${pokemon.id})</h3>
        <p><strong>Tipo:</strong> ${typesString}</p>

        <div class="stats-grid">
            <div class="stat-item"><strong>Altura</strong></div>
            <div class="stat-value">${pokemon.height}"</div>
            <div class="stat-item"><strong>Peso</strong></div>
            <div class="stat-value">${pokemon.weight} lbs</div>
        </div>

        <p class="description-text">${description}</p>
    `;

        // Se limpian y se crean los botones de acción
        detailsButtons.innerHTML = '';
        const sendEmailBtn = document.createElement('button');
        sendEmailBtn.className = 'btn-image-style';
        sendEmailBtn.textContent = 'Enviar a Correo';
        sendEmailBtn.addEventListener('click', () => {
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
    });

    // --- MANEJADORES DE EVENTOS ---

    filterBtn.addEventListener('click', () => {
        currentPage = 1;
        loadPokemons(currentPage, nameFilterInput.value, speciesFilterSelect.value);
    });

    clearFiltersBtn.addEventListener('click', () => {
        currentPage = 1;
        nameFilterInput.value = '';
        speciesFilterSelect.value = 'all';
        loadPokemons(currentPage, '', 'all');
        detailsContent.innerHTML = '<p class="placeholder-text">Selecciona un Pokémon de la lista...</p>';
        detailsButtons.innerHTML = '';
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
