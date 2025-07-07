const apiBaseUrl = 'https://localhost:7118/api'; 

document.addEventListener('DOMContentLoaded', () => {

    
    const pokemonTableBody = document.getElementById('pokemon-table-body');
    const paginationControls = document.getElementById('pagination-controls');
    const filterForm = document.getElementById('filter-form');
    const nameFilterInput = document.getElementById('nameFilter');
    const speciesFilterSelect = document.getElementById('speciesFilter');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const exportBtn = document.getElementById('export-excel-btn');
    const emailForm = document.getElementById('send-email-form');

    let currentPage = 1;
    let currentNameFilter = '';
    let currentSpeciesFilter = 'all';


    async function loadPokemonTypes() {
        try {
            const response = await fetch(`${apiBaseUrl}/pokemon/types`);
            const types = await response.json();
            speciesFilterSelect.innerHTML = '<option value="all">Todas</option>'; // Limpia y a�ade la opci�n por defecto
            types.forEach(type => {
                const option = document.createElement('option');
                option.value = type.name;
                option.textContent = type.name.charAt(0).toUpperCase() + type.name.slice(1);
                speciesFilterSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error al cargar los tipos de Pok�mon:', error);
        }
    }

    // Funci�n para cargar los Pok�mon
    async function loadPokemons(page = 1, name = '', species = 'all') {
        pokemonTableBody.innerHTML = '<tr><td colspan="4" class="text-center">Cargando...</td></tr>';

        // Construye la URL con los par�metros
        const url = `${apiBaseUrl}/pokemon?page=${page}&limit=20&nameFilter=${name}&speciesFilter=${species}`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

            const data = await response.json();
            pokemonTableBody.innerHTML = ''; // Limpia la tabla

            if (data.results.length === 0) {
                pokemonTableBody.innerHTML = '<tr><td colspan="4" class="text-center">No se encontraron Pok�mon.</td></tr>';
            }

            data.results.forEach(pokemon => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><img src="${pokemon.sprites?.frontDefault ?? ''}" alt="${pokemon.name}" width="50"></td>
                    <td>${pokemon.name}</td>
                    <td>${pokemon.types.map(t => t.type.name).join(', ')}</td>
                    <td><button class="btn btn-sm btn-info" onclick="showDetails('${pokemon.name}')">Detalles</button></td>
                `;
                pokemonTableBody.appendChild(row);
            });

            setupPagination(data.totalPages, data.currentPage);

        } catch (error) {
            console.error('No se pudieron cargar los Pok�mon:', error);
            pokemonTableBody.innerHTML = '<tr><td colspan="4" class="text-center">Error al cargar los datos.</td></tr>';
        }
    }

    // Funci�n para dibujar los controles de paginaci�n
    function setupPagination(totalPages, currentPage) {
        paginationControls.innerHTML = '';
        if (totalPages <= 1) return;

        const maxPagesToShow = 10; // Ajusta cu�ntos n�meros de p�gina mostrar
        let startPage;
        let endPage;

        if (totalPages <= maxPagesToShow) {
            // Muestra todas las p�ginas si no son muchas
            startPage = 1;
            endPage = totalPages;
        } else {
            // Calcula el rango de p�ginas a mostrar alrededor de la actual
            const maxPagesBeforeCurrent = Math.floor(maxPagesToShow / 2);
            const maxPagesAfterCurrent = Math.ceil(maxPagesToShow / 2) - 1;
            if (currentPage <= maxPagesBeforeCurrent) {
                startPage = 1;
                endPage = maxPagesToShow;
            } else if (currentPage + maxPagesAfterCurrent >= totalPages) {
                startPage = totalPages - maxPagesToShow + 1;
                endPage = totalPages;
            } else {
                startPage = currentPage - maxPagesBeforeCurrent;
                endPage = currentPage + maxPagesAfterCurrent;
            }
        }

        // Elementos de la paginaci�n ---

        // Bot�n "Anterior"
        let liPrev = document.createElement('li');
        liPrev.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
        let aPrev = document.createElement('a');
        aPrev.className = 'page-link';
        aPrev.href = '#';
        aPrev.textContent = 'Anterior';
        aPrev.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentPage > 1) {
                loadPokemons(currentPage - 1, currentNameFilter, currentSpeciesFilter);
            }
        });
        liPrev.appendChild(aPrev);
        paginationControls.appendChild(liPrev);

        // Primera p�gina
        if (startPage > 1) {
            let liFirst = document.createElement('li');
            liFirst.className = 'page-item';
            let aFirst = document.createElement('a');
            aFirst.className = 'page-link';
            aFirst.href = '#';
            aFirst.textContent = '1';
            aFirst.addEventListener('click', (e) => {
                e.preventDefault();
                loadPokemons(1, currentNameFilter, currentSpeciesFilter);
            });
            liFirst.appendChild(aFirst);
            paginationControls.appendChild(liFirst);

            if (startPage > 2) {
                let liEllipsis = document.createElement('li');
                liEllipsis.className = 'page-item disabled';
                liEllipsis.innerHTML = '<span class="page-link">...</span>';
                paginationControls.appendChild(liEllipsis);
            }
        }

        // N�meros de p�gina en el rango
        for (let i = startPage; i <= endPage; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === currentPage ? 'active' : ''}`;
            const a = document.createElement('a');
            a.className = 'page-link';
            a.href = '#';
            a.textContent = i;
            if (i !== currentPage) {
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    loadPokemons(i, currentNameFilter, currentSpeciesFilter);
                });
            }
            li.appendChild(a);
            paginationControls.appendChild(li);
        }

        // Ultima p�gina
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                let liEllipsis = document.createElement('li');
                liEllipsis.className = 'page-item disabled';
                liEllipsis.innerHTML = '<span class="page-link">...</span>';
                paginationControls.appendChild(liEllipsis);
            }

            let liLast = document.createElement('li');
            liLast.className = 'page-item';
            let aLast = document.createElement('a');
            aLast.className = 'page-link';
            aLast.href = '#';
            aLast.textContent = totalPages;
            aLast.addEventListener('click', (e) => {
                e.preventDefault();
                loadPokemons(totalPages, currentNameFilter, currentSpeciesFilter);
            });
            liLast.appendChild(aLast);
            paginationControls.appendChild(liLast);
        }

        // Bot�n "Siguiente"
        let liNext = document.createElement('li');
        liNext.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
        let aNext = document.createElement('a');
        aNext.className = 'page-link';
        aNext.href = '#';
        aNext.textContent = 'Siguiente';
        aNext.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentPage < totalPages) {
                loadPokemons(currentPage + 1, currentNameFilter, currentSpeciesFilter);
            }
        });
        liNext.appendChild(aNext);
        paginationControls.appendChild(liNext);
    }

    // Evento para el formulario de filtrado
    filterForm.addEventListener('submit', (event) => {
        event.preventDefault();
        currentPage = 1; // Resetea a la primera p�gina con cada nuevo filtro
        currentNameFilter = nameFilterInput.value;
        currentSpeciesFilter = speciesFilterSelect.value;
        loadPokemons(currentPage, currentNameFilter, currentSpeciesFilter);
    });

    // Evento para el bot�n de limpiar filtros
    clearFiltersBtn.addEventListener('click', () => {
        currentPage = 1;
        nameFilterInput.value = '';
        speciesFilterSelect.value = 'all';
        currentNameFilter = '';
        currentSpeciesFilter = 'all';
        loadPokemons(currentPage, currentNameFilter, currentSpeciesFilter);
    });

    
    document.addEventListener('click', function (event) {
        // Solo nos interesa si se hizo clic en nuestro bot�n espec�fico
        if (event.target && event.target.id === 'sendDetailsByEmailBtn') {

            // 1. Obtener los datos del Pok�mon desde los atributos del bot�n
            const name = event.target.dataset.pokemonName;
            const id = event.target.dataset.pokemonId;
            const types = event.target.dataset.pokemonTypes;
            const image = event.target.dataset.pokemonImage;

            // 2. Encontrar el formulario del modal de correo
            const emailForm = document.getElementById('send-email-form');

            // 3. Llenar los campos ocultos del formulario con los datos del Pok�mon
            emailForm.querySelector('input[name="pokemonName"]').value = name;
            emailForm.querySelector('input[name="pokemonId"]').value = id;
            emailForm.querySelector('input[name="pokemonTypes"]').value = types;
            emailForm.querySelector('input[name="pokemonImage"]').value = image;

            // 4. (Opcional) Personalizar el asunto del correo
            emailForm.querySelector('input[name="subject"]').value = `Detalles del Pokemon: ${name}`;

            // 5. Cerrar el modal de detalles y abrir el de correo
            const detailsModal = bootstrap.Modal.getInstance(document.getElementById('pokemonDetailsModal'));
            detailsModal.hide();

            const emailModal = new bootstrap.Modal(document.getElementById('sendEmailModal'));
            emailModal.show();
        }
    });
    emailForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Evita que la p�gina se recargue

        const submitButton = emailForm.querySelector('button[type="submit"]');
        submitButton.disabled = true; // Deshabilita el bot�n para evitar env�os m�ltiples
        submitButton.textContent = 'Enviando...';

        // Recolecta los datos del formulario
        const formData = new FormData(emailForm);
        const requestData = {
            emailAddress: formData.get('emailAddress'),
            subject: formData.get('subject'),
            body: formData.get('body'),
            // A�ade los datos del Pok�mon si existen
            pokemonName: formData.get('pokemonName'),
            pokemonId: parseInt(formData.get('pokemonId')) || 0,
            pokemonTypes: formData.get('pokemonTypes'),
            pokemonImage: formData.get('pokemonImage'),
            // A�ade los filtros si existen
            nameFilter: document.getElementById('nameFilter').value,
            speciesFilter: document.getElementById('speciesFilter').value
        };

        try {
            const response = await fetch(`${apiBaseUrl}/pokemon/send-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Error en el servidor.');
            }

            alert(result.message); // Muestra mensaje de �xito
            bootstrap.Modal.getInstance(document.getElementById('sendEmailModal')).hide(); // Cierra el modal

        } catch (error) {
            console.error('Error al enviar correo:', error);
            alert(`Error: ${error.message}`); // Muestra mensaje de error
        } finally {
            submitButton.disabled = false; // Vuelve a habilitar el bot�n
            submitButton.textContent = 'Enviar';
        }
    });

    exportBtn.addEventListener('click', () => {
        // Obtenemos los valores actuales de los filtros
        const nameFilter = document.getElementById('nameFilter').value;
        const speciesFilter = document.getElementById('speciesFilter').value;

        // Construimos la URL con los par�metros de consulta
        const exportUrl = `${apiBaseUrl}/pokemon/export?nameFilter=${nameFilter}&speciesFilter=${speciesFilter}`;

        // Redirigimos el navegador a la URL para iniciar la descarga
        window.location.href = exportUrl;
    });

    // Carga inicial
    loadPokemonTypes();
    loadPokemons();
});

// Funci�n para mostrar detalles (ejemplo)
async function showDetails(pokemonName) {
    try {
        const response = await fetch(`${apiBaseUrl}/pokemon/${pokemonName}`);
        if (!response.ok) throw new Error('No se encontr� el Pok�mon.');
        const pokemon = await response.json();

        // Ahora usamos 'pokemon.description' que viene de la API
        const detailsBody = `
            <h3>${pokemon.name}</h3>
            <img src="${pokemon.sprites?.frontDefault}" alt="${pokemon.name}" class="img-fluid" />
            <p><strong>ID:</strong> ${pokemon.id}</p>
            <p><strong>Especie:</strong> ${pokemon.types.map(t => t.type.name).join(', ')}</p>
            <p><strong>Descripcion:</strong> ${pokemon.description}</p> 
        `; // <-- L�NEA ACTUALIZADA

        const detailsFooter = `
    <button type="button" class="btn btn-primary" id="sendDetailsByEmailBtn" 
            data-pokemon-name="${pokemon.name}" 
            data-pokemon-id="${pokemon.id}"
            data-pokemon-types="${pokemon.types.map(t => t.type.name).join(', ')}"
            data-pokemon-image="${pokemon.sprites?.frontDefault ?? ''}">
        Enviar a Correo
    </button>
    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
`;

        document.getElementById('pokemonDetailsBody').innerHTML = detailsBody;
        document.getElementById('pokemonDetailsFooter').innerHTML = detailsFooter;

        const detailsModal = new bootstrap.Modal(document.getElementById('pokemonDetailsModal'));
        detailsModal.show();
    } catch (error) {
        console.error('Error al cargar detalles:', error);
        alert('No se pudieron cargar los detalles del Pok�mon.');
    }
}