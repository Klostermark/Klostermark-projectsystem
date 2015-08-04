require('controllers/companies/index.js');

(function (angular) {
  "use strict";

  var app = angular.module('myApp.reports', ['ngRoute', 'firebase.utils', 'firebase', 'ngMaterial', 'ngMessages']);

  app.controller('ReportsCtrl', [
    '$scope',
    'categoriesFactory',
    'companiesFactory',
    'activitiesFactory',
    function($scope, categoriesFactory, companiesFactory, activitiesFactory) {

      var 
        setDefaultDate, companies, tasks, activities, categoryId, compileReport, tryInitiate,
        self = this;

      $scope.filter = {
        month: null,
        category: null
      };
      $scope.storted = null;

      // fetch data
      $scope.categories = categoriesFactory.all();
      companies = companiesFactory.all();

      $scope.categories.$loaded().then(function () {
        tryInitiate('categories');
      });
      companies.$loaded().then(function () {
        tryInitiate('companies');
      });


      $scope.waitingFor = ['categories', 'companies'];
      tryInitiate = function (which) {
        $scope.waitingFor.splice($scope.waitingFor.indexOf(which), 1);

        if ($scope.waitingFor.length === 0) {
          setDefaultDate();
        }
      }


      setDefaultDate = function () {
        var
          now = new Date(),
          month = new Date(now.getFullYear() + '-' + (now.getMonth() + 1));

        $scope.filter.month = month;
      }

      $scope.tryCompileReport = function () {
        var timestamp;

        if ($scope.filter.month && $scope.filter.month.getFullYear() > 2000 && $scope.filter.category) {
          timestamp = $scope.filter.month.getTime();
          categoryId = $scope.filter.category.$id;
          tasks = $scope.filter.category.tasks;

          activities = activitiesFactory.get(timestamp);

          activities
          .$loaded()
          .then(function (res) {
            // add listener
            activities.$watch(function () {
              compileReport();
            });

            compileReport();
          });

        }
      }

      compileReport = function () {
        var
          i, companyId, task, incomplete,
          sorted = {
            complete: [],
            incomplete: []
          };

        for (i = 0; i < companies.length; i++) {

          if (companies[i].categories && companies[i].categories[categoryId]) {
            companyId = companies[i].$id;

            // sort out companies subscribed to category
            if (activities[companyId]) {
              incomplete = false;

              for (task in tasks) {
                if ( ! activities[companyId][task]) {
                  // task is missing in activities
                  incomplete = true;
                  sorted.incomplete.push(companies[i]);
                  break;
                }
              }

              incomplete || sorted.complete.push(companies[i]);

            } else {
              // the company have no activities this month
              sorted.incomplete.push(companies[i]);
            }
          }
        }
        $scope.sorted = sorted;
      }

    }]);

})(angular);