const apiBaseUrl = 'https://localhost:7118/api'; 

document.addEventListener('DOMContentLoaded', () => {

    const apiBaseUrl = 'https://localhost:7118/api/pokemon';

    const pokemonList = document.getElementById('pokemon-list');
    const paginationControls = document.getElementById('pagination-controls');
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



    let currentPage = 1;
    let currentPokemons = [];
    let selectedPokemonLi = null;


    async function loadPokemons(page = 1, name = '', species = 'all') {
        pokemonList.innerHTML = '<li class="placeholder-text" style="justify-content: center; padding: 20px;">Cargando...</li>';
        const url = `${apiBaseUrl}?page=${page}&limit=20&nameFilter=${name}&speciesFilter=${species}`;

        // El bloque 'try' debe ir seguido de un bloque 'catch'
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

            const data = await response.json();
            currentPokemons = data.results;
            pokemonList.innerHTML = '';

            if (currentPokemons.length === 0) {
                pokemonList.innerHTML = '<li class="placeholder-text" style="justify-content: center; padding: 20px;">No se encontraron Pokémon.</li>';
                setupPagination(0, 1);
                return;
            }

            currentPokemons.forEach(pokemon => {
                const listItem = document.createElement('li');
                listItem.dataset.pokemonName = pokemon.name;
                listItem.innerHTML = `
                <img src="${pokemon.sprites?.front_default || ''}" alt="${pokemon.name}" style="width: 40px; height: 40px; margin-right: 10px;">
                <span>No. ${String(pokemon.id).padStart(3, '0')}</span>
                <span style="margin-left: auto; text-transform: capitalize;">${pokemon.name}</span>
            `;

                listItem.addEventListener('click', () => {
                    showDetails(pokemon);
                    if (selectedPokemonLi) selectedPokemonLi.classList.remove('selected');
                    listItem.classList.add('selected');
                    selectedPokemonLi = listItem;
                });

                pokemonList.appendChild(listItem);
            });

            setupPagination(data.totalPages, data.currentPage);

        } catch (error) { // Este bloque 'catch' es el que faltaba o estaba incorrecto
            console.error('No se pudieron cargar los Pokémon:', error);
            pokemonList.innerHTML = `<li class="placeholder-text" style="color: red; justify-content: center; padding: 20px;">${error.message}</li>`;
        }
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

    paginationControls.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') {
            const page = e.target.dataset.page;
            if (page) {
                loadPokemons(parseInt(page), nameFilterInput.value, speciesFilterSelect.value);
            }
        }
    });

    // --- PAGINACIÓN --- (Función mejorada)

    function setupPagination(totalPages, page) {
        paginationControls.innerHTML = '';
        currentPage = page;

        // Botón "Anterior"
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
        prevLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage - 1}">Ant</a>`;
        paginationControls.appendChild(prevLi);

        // Números de página
        for (let i = 1; i <= totalPages; i++) {
            if (i === currentPage) {
                const li = document.createElement('li');
                li.className = 'page-item active';
                li.innerHTML = `<span class="page-link">${i}</span>`;
                paginationControls.appendChild(li);
            } else if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                const li = document.createElement('li');
                li.className = 'page-item';
                li.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
                paginationControls.appendChild(li);
            } else if (i === currentPage - 3 || i === currentPage + 3) {
                const li = document.createElement('li');
                li.className = 'page-item disabled';
                li.innerHTML = `<span class="page-link">...</span>`;
                paginationControls.appendChild(li);
            }
        }

        // Botón "Siguiente"
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
        nextLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage + 1}">Sig</a>`;
        paginationControls.appendChild(nextLi);
    }

    // --- Carga Inicial ---
    loadPokemonTypes();
    loadPokemons();
}
);
