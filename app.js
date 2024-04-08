(function () {

    angular.module('app', ['angular-locker']);

    AppCtrl.$inject = ['$http', 'locker'];
    function AppCtrl($http, locker) {
        var vm = this;

        vm.totalSteps = 34;
        vm.sorting = locker.get('sorting', 0);
        vm.saveData = locker.get('save') || [];
        vm.displayOwnedMonsters = locker.get('displayOwnedMonsters', false);
        vm.displayFinishedZones = locker.get('displayFinishedZones', false);
        vm.displayFinishedSteps = locker.get('displayFinishedSteps', false);

        vm.increaseQuantity = function(monster) {
            monster.quantity++;
            vm.updateQuantity(monster);
        };
        
        vm.decreaseQuantity = function(monster) {
            if (monster.quantity > 0) {
                monster.quantity--;
                vm.updateQuantity(monster);
            }
        };

        vm.importData = function(event) {
            var file = event.target.files[0];
            if (file) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    var contents = e.target.result;
                    var importedData = JSON.parse(contents);
        
                    if (!vm.saveData) {
                        vm.saveData = [];
                    }
        
                    vm.monsters.forEach(function(monster) {
                        var importedMonster = importedData.find(function(m) { return m.id === monster.id; });
                        if (importedMonster) {
                            monster.quantity = importedMonster.quantity;
                            const index = vm.saveData.indexOf(monster.id);
                            if (monster.quantity > 0 && index === -1) {
                                vm.saveData.push(monster.id);
                            } else if (monster.quantity <= 0 && index > -1) {
                                vm.saveData.splice(index, 1);
                            }
                        }
                    });
        
                    locker.put('save', vm.saveData);
                    locker.put('monsterQuantities', vm.monsters.map(function(m) { return { id: m.id, quantity: m.quantity }; }));
                    location.reload();
                };
                reader.readAsText(file);
            }
        };

        vm.exportData = function() {
            var exportData = vm.monsters
                .filter(function(monster) {
                    return vm.saveData.includes(monster.id) || monster.quantity >= 1;
                })
                .map(function(monster) {
                    return { id: monster.id, quantity: monster.quantity };
                });
        
            var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData));
            var downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "monsters_export.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        };

        vm.sortZonesAlphabetically = function() {
            if (vm.monsters && vm.monsters.length > 0) {
                vm.monsters.forEach(function(monster) {
                    if (monster.zones && monster.zones.length > 0) {
                        monster.zones.sort();
                    }
                });
            }
        };

        vm.updateQuantity = function(monster) {
            monster.quantity = monster.quantity < 0 ? 0 : monster.quantity;
        
            if (monster.quantity >= 1 && vm.saveData.indexOf(monster.id) === -1) {
                vm.saveData.push(monster.id);
            } else if (monster.quantity < 1) {
                const index = vm.saveData.indexOf(monster.id);
                if (index > -1) {
                    vm.saveData.splice(index, 1);
                }
            }
        
            locker.put('save', vm.saveData);
            locker.put('monsterQuantities', vm.monsters.map(function(m) { return { id: m.id, quantity: m.quantity }; }));
        };

        vm.isOwned = function(monster) {
            if (!vm.saveData || !monster) {
                return false;
            }

            return vm.saveData.indexOf(monster.id) >= 0;
        };

        vm.toggleMonster = function(monster, val) {
            vm.saveData = locker.get('save', []);
            if (vm.saveData.indexOf(monster.id) >= 0) {
                if (angular.isUndefined(val) || val === false) {
                    vm.saveData.splice(vm.saveData.indexOf(monster.id), 1);
                }
            } else {
                if (angular.isUndefined(val) || val === true) {
                    vm.saveData.push(monster.id);
                }
            }
        
            locker.put('save', vm.saveData);
            locker.put('monsterQuantities', vm.monsters.map(function(m) { return { id: m.id, quantity: m.quantity }; }));
        };

        vm.owned = function(type, zone, step) {
            if (!vm.monsters) {
                return '?';
            }

            return vm.monsters.filter(function(monster) {
                if (!vm.isOwned(monster)) {
                    return false;
                }

                if (!type && !zone && !step) {
                    return true;
                }

                if (type && monster.type == type) {
                    return true;
                }

                if (zone && monster.zones.indexOf(zone) >= 0) {
                    return true;
                }

                if (step && monster.step == step) {
                    return true;
                }

                return false;
            }).length;
        };

        vm.ownedPercentage = function(type, zone, step) {
            return Math.ceil(vm.owned(type, zone, step) * 100 / vm.total(type, zone, step)) || 0;
        };

        vm.total = function(type, zone, step) {
            if (!vm.monsters) {
                return '?';
            }

            return vm.monsters.filter(function(monster) {
                if (type) {
                    return monster.type == type;
                }

                if (zone) {
                    return monster.zones.indexOf(zone) >= 0;
                }

                if (step) {
                    return monster.step == step;
                }

                return true;
            }).length;
        };

        vm.load = function() {
            vm.saveData = vm.loadData;

            locker.put('save', vm.loadData.split(',').map(function(id) {
                return parseInt(id);
            }));

            vm.loadData = null;
        };

        vm.toggleZone = function(zone) {
            var newVal = true;
        
            if (vm.owned(false, zone) == vm.total(false, zone)) {
                newVal = false;
            }
        
            vm.monsters.forEach(function(monster) {
                if (monster.zones.indexOf(zone) >= 0 && monster.quantity < 1) {
                    vm.toggleMonster(monster, newVal);
                }
            });
        };

        vm.toggleStep = function(step) {
            var newVal = true;
        
            if (vm.owned(false, false, step) == vm.total(false, false, step)) {
                newVal = false;
            }
        
            vm.monsters.forEach(function(monster) {
                if (monster.step == step && monster.quantity < 1) {
                    vm.toggleMonster(monster, newVal);
                }
            });
        };

        vm.completedSteps = function() {
            if (!vm.monsters) {
                return '??';
            }

            return vm.monsters.map(function(monster) {
                return monster.step;
            }).sort().filter(function(step, index, steps) {
                return index == steps.indexOf(step);
            }).filter(function(step) {
                return vm.ownedPercentage(false, false, step) == 100;
            }).length;
        };

        vm.completedStepsPercentage = function() {
            return Math.ceil(vm.completedSteps() * 100 / vm.totalSteps);
        };

        vm.chooseSorting = function(sorting) {
            vm.sorting = sorting;

            locker.put('sorting', sorting);
        };


        vm.toggleOwnedMonsters = function() {
            locker.put('displayOwnedMonsters', vm.displayOwnedMonsters);
        }

        vm.toggleFinishedZones = function() {
            locker.put('displayFinishedZones', vm.displayFinishedZones);
        }

        vm.toggleFinishedSteps = function() {
            locker.put('displayFinishedSteps', vm.displayFinishedSteps);
        }

        vm.resetAll = function() {
            if (confirm('Dernière chance !')) {
                locker.clean();
        
                vm.sorting = 0;
                vm.saveData = null;
                vm.displayOwnedMonsters = true;
                vm.displayFinishedZones = true;
                vm.displayFinishedSteps = true;
                vm.zones = {};
                vm.steps = [];
                vm.monsters = [];
        
                $('#saveModal').modal('hide');
        
                location.reload();
            }
        };

        $http.get('monsters.json').then(function(res) {
            vm.monsters = res.data.map(function(monster) {
                var savedQuantities = locker.get('monsterQuantities', []);
                var found = savedQuantities.find(function(m) { return m.id === monster.id; });
                monster.quantity = found ? found.quantity : 0;
                return monster;
            });

            vm.sortZonesAlphabetically();

            vm.zones = {};
            vm.steps = [];

            angular.forEach(vm.monsters, function(monster) {
                angular.forEach(monster.zones, function(zone) {
                    if (angular.isUndefined(vm.zones[zone])) {
                        vm.zones[zone] = [];
                    }

                    vm.zones[zone].push(monster);
                });

                if (angular.isUndefined(vm.steps[monster.step])) {
                    vm.steps[monster.step] = [];
                }

                vm.steps[monster.step].push(monster);
            });
        });
    }

    angular.module('app')
        .controller('AppCtrl', AppCtrl);

}());

   // PAGE TENTATIVES d'EXO //

    var currentSortColumnIndex = null;
    var currentSortDirection = 'asc'; // 'asc' pour ascendant, 'desc' pour descendant

    document.addEventListener('DOMContentLoaded', function() {
        loadTableData();
    
        document.getElementById('addEntry').addEventListener('click', function() {
            var personnageName = document.getElementById('personnageName').value;
            var itemName = document.getElementById('itemName').value;
            var tentativesNumber = document.getElementById('tentativesNumber').value;
        
            if (personnageName && itemName && tentativesNumber >= 1) {
                addRowToTable(personnageName, itemName, tentativesNumber);
                document.getElementById('personnageName').value = '';
                document.getElementById('itemName').value = '';
                document.getElementById('tentativesNumber').value = '';
            } else {
                alert("Veuillez remplir tous les champs correctement. Le nombre de tentatives doit être supérieur ou égal à 1.");
            }
        });
    
        document.querySelectorAll('#tentativesTable th').forEach(function(header, index) {
            header.addEventListener('click', function() {
                if (currentSortColumnIndex === index) {
                    currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    currentSortDirection = 'asc';
                }
                currentSortColumnIndex = index;
                sortTableByColumn(index, currentSortDirection);
                updateSortIndicator(index, currentSortDirection);
            });
        });
    });

    function updateSortIndicator(columnIndex, sortDirection) {
        // Supprimer les indicateurs existants
        document.querySelectorAll('#tentativesTable th').forEach(function(header) {
            header.classList.remove('sort-asc', 'sort-desc');
        });
        
        // Ajouter l'indicateur au bon en-tête
        var header = document.querySelectorAll('#tentativesTable th')[columnIndex];
        var indicatorClass = sortDirection === 'asc' ? 'sort-asc' : 'sort-desc';
        header.classList.add(indicatorClass);
    }
    
    function sortTableByColumn(columnIndex, sortDirection) {
        var table = document.getElementById('tentativesTable');
        var tbody = table.getElementsByTagName('tbody')[0];
        var rows = Array.from(tbody.getElementsByTagName('tr'));
    
        var sortedRows = rows.sort(function(a, b) {
            var textA = a.getElementsByTagName('td')[columnIndex].textContent.toUpperCase();
            var textB = b.getElementsByTagName('td')[columnIndex].textContent.toUpperCase();
    
            if (sortDirection === 'asc') {
                return textA.localeCompare(textB);
            } else {
                return textB.localeCompare(textA);
            }
        });
    
        while (tbody.firstChild) {
            tbody.removeChild(tbody.firstChild);
        }
    
        sortedRows.forEach(function(row) {
            tbody.appendChild(row);
        });
    
        saveTableData();
    }

function saveTableData() {
    var tableData = [];
    var tableBody = document.getElementById('tentativesTable').getElementsByTagName('tbody')[0];
    for (var i = 0, row; row = tableBody.rows[i]; i++) {
        tableData.push({
            personnage: row.cells[0].textContent,
            item: row.cells[1].textContent,
            tentatives: row.cells[2].textContent
        });
    }
    localStorage.setItem('tentativesTableData', JSON.stringify(tableData));
}

function loadTableData() {
    var storedData = localStorage.getItem('tentativesTableData');
    if (storedData) {
        var tableData = JSON.parse(storedData);
        tableData.forEach(function(rowData) {
            addRowToTable(rowData.personnage, rowData.item, rowData.tentatives, false);
        });
    }
}

function addRowToTable(personnageName, itemName, tentativesNumber, saveData = true) {
    var tableBody = document.getElementById('tentativesTable').getElementsByTagName('tbody')[0];
    var newRow = tableBody.insertRow();
    var cell1 = newRow.insertCell(0);
    var cell2 = newRow.insertCell(1);
    var cell3 = newRow.insertCell(2);
    var cell4 = newRow.insertCell(3); // Cellule pour le bouton supprimer

    cell1.textContent = personnageName;
    cell2.textContent = itemName;
    cell3.textContent = tentativesNumber;
    
    // Créer un bouton supprimer et l'ajouter à la cellule
    var deleteButton = document.createElement('button');
    deleteButton.textContent = 'Supprimer';
    deleteButton.className = 'btn btn-danger btn-sm'; // Classe Bootstrap pour le style
    deleteButton.onclick = function() {
        // Supprimer la ligne du tableau
        tableBody.removeChild(newRow);
        // Sauvegarder l'état actuel du tableau après suppression
        saveTableData();
    };
    cell4.appendChild(deleteButton);

    // Sauvegarder les données du tableau dans localStorage, si nécessaire
    if (saveData) {
        saveTableData();
    }
}
