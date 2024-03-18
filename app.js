(function () {

    angular.module('app', ['angular-locker']);

    AppCtrl.$inject = ['$http', 'locker'];
    function AppCtrl($http, locker) {
        var vm = this;

        vm.totalSteps = 34;
        vm.sorting = locker.get('sorting', 0);
        vm.saveData = locker.get('save');
        vm.displayOwnedMonsters = locker.get('displayOwnedMonsters', false);
        vm.displayFinishedZones = locker.get('displayFinishedZones', false);
        vm.displayFinishedSteps = locker.get('displayFinishedSteps', false);

        vm.importData = function(event) {
            var file = event.target.files[0];
            if (file) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    var contents = e.target.result;
                    var importedData = JSON.parse(contents);
        
                    vm.monsters.forEach(function(monster) {
                        var importedMonster = importedData.find(function(m) { return m.id === monster.id; });
                        if (importedMonster) {
                            monster.quantity = importedMonster.quantity;
                            vm.toggleMonster(monster, true);
                        }
                    });
        
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
            if (monster.quantity >= 1) return;
        
            if (vm.saveData.indexOf(monster.id) >= 0) {
                if (angular.isUndefined(val) || val === false) {
                    vm.saveData.splice(vm.saveData.indexOf(monster.id), 1);
                }
            } else {
                if (angular.isUndefined(val) || val === true) {
                    vm.saveData.push(monster.id);
                    if (monster.quantity === 0) {
                        monster.quantity = 1;
                    }
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

            vm.monsters.map(function(monster) {
                if (monster.zones.indexOf(zone) >= 0) {
                    vm.toggleMonster(monster, newVal);
                }
            });
        };

        vm.toggleStep = function(step) {
            var newVal = true;

            if (vm.owned(false, false, step) == vm.total(false, false, step)) {
                newVal = false;
            }

            vm.monsters.map(function(monster) {
                if (monster.step == step) {
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
