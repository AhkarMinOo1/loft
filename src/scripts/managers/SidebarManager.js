import { chair, table, sofa, roundTable } from '../asset.js';

export class SidebarManager {
    constructor(uiManager) {
        this.ui = uiManager;
        this.sidebar = document.getElementById('sidebar');
        this.toggleButton = document.getElementById('sidebar-toggle');
        this.initSidebar();
        this.initObjectLibrary();
    }

    initSidebar() {
        this.toggleButton.addEventListener('click', () => {
            this.sidebar.classList.toggle('active');
            this.toggleButton.classList.toggle('active');
        });
    }

    initObjectLibrary() {
        const librarySections = [
            {
                title: "Furniture",
                icon: "bi-chair",
                items: [
                    {
                        name: "Chair",
                        thumbnail: "./assets/thumbnails/chair.jpg",
                        icon: "bi-chair",
                        action: async () => {
                            const chairModel = await this.ui.createChair();
                            if (chairModel) {
                                chairModel.position.set(0, 0.5, 0);
                                chairModel.userData = {
                                    isChair: true,
                                    isMovable: true,
                                    isRotatable: true
                                };
                            }
                        }
                    },
                    {
                        name: "Table",
                        thumbnail: "./assets/thumbnails/table.jpg",
                        icon: "bi-table",
                        action: async () => {
                            const tableModel = await this.ui.createTable();
                            if (tableModel) {
                                tableModel.position.set(0, 0.5, 0);
                                tableModel.userData = {
                                    isFurniture: true,
                                    isMovable: true,
                                    isRotatable: true
                                };
                            }
                        }
                    },
                    {
                        name: "Sofa",
                        thumbnail: "./assets/thumbnails/sofa.jpg",
                        icon: "bi-sofa",
                        action: async () => {
                            const sofaModel = await this.ui.createSofa();
                            if (sofaModel) {
                                sofaModel.position.set(0, 0.5, 0);
                                sofaModel.userData = {
                                    isSofa: true,
                                    isMovable: true,
                                    isRotatable: true
                                };
                            }
                        }
                    },
                    {
                        name: "Round Table",
                        thumbnail: "./assets/thumbnails/roundTable.jpg",
                        icon: "bi-lightbulb",
                        action: async () => {
                            const roundTableModel = await this.ui.createRoundTable();
                            if (roundTableModel) {
                                roundTableModel.position.set(0, 0.5, 0);
                                roundTableModel.userData = {
                                    isTable: true,
                                    isMovable: true,
                                    isRotatable: true
                                };
                            }
                        }
                    }
                ]
            },
            {
                title: "Structures",
                icon: "bi-bricks",
                items: [
                    {
                        name: "Wall",
                        thumbnail: "./assets/thumbnails/wall.jpg",
                        icon: "bi-bricks",
                        action: () => {
                            this.ui.wallManager.toggleAddWallMode();
                            this.ui.isRemoveMode = false;
                            this.ui.removeButton.classList.remove("active");
                            document.body.classList.remove("remove-mode");
                        }
                    }
                ]
            }
        ];

        const container = document.getElementById("library-items");
        
        librarySections.forEach(section => {
            const sectionElement = document.createElement("div");
            sectionElement.className = "library-section";
            
            const titleElement = document.createElement("h3");
            titleElement.innerHTML = `<i class="bi ${section.icon}"></i>${section.title}`;
            sectionElement.appendChild(titleElement);

            const gridElement = document.createElement("div");
            gridElement.className = "library-grid";

            section.items.forEach(item => {
                const button = document.createElement("button");
                button.className = "object-btn";
                button.setAttribute('data-tooltip', `Add ${item.name}`);
                button.innerHTML = `
                    <img src="${item.thumbnail}" alt="${item.name}">
                    <span><i class="bi ${item.icon}"></i> ${item.name}</span>
                `;
                button.addEventListener("click", () => {
                    item.action();
                    this.sidebar.classList.remove('active');
                });
                gridElement.appendChild(button);
            });

            sectionElement.appendChild(gridElement);
            container.appendChild(sectionElement);
        });
    }
}