require('controllers/companies/index.js');

(function (angular) {
  "use strict";

  angular
  .module('myApp.companies')
  .controller('EditCompanyCtrl', [
    '$scope',
    '$routeParams',
    'companiesFactory',
    'categoriesFactory',
    function($scope, $routeParams, companiesFactory, categoriesFactory) {

      var
        self = this,
        id = $routeParams.id;

      $scope.status = 'pristine';
      $scope.companyCategories = [];
      $scope.banks = ['SEB', 'Handelsbanken', 'Nordea', 'Swedbank', 'Annan'];

      // fetch data
      $scope.company = companiesFactory.get(id);
      $scope.categories = categoriesFactory.all();

      
      // watch for fully loaded data
      $scope.company.$watch(function () {
        self.fetched('company');
      })
      $scope.categories.$watch(function () {
        self.fetched('categories');
      })

      // wait so all data is fetched
      this.keepTrack = ['company', 'categories'];
      this.fetched = function (data) {
        var i = this.keepTrack.indexOf(data);

        if (i > -1) {
          this.keepTrack.splice(i, 1);
        }

        if (this.keepTrack.length === 0) {
          $scope.fetched = true;
          // display categories used by company
          $scope.companyCategories = this.matchCompanyCategories();

          // fix date issue
          ! $scope.company.brokenFiscalYear || self.setDate('closingMonth', $scope.company.closingMonth)
          ! $scope.company.brokenFiscalYear || self.setDate('firstClosing', $scope.company.firstClosing)
        }
      }

      $scope.removeChip = function (chip, form) {
        if ($scope.company.categories) {
          delete $scope.company.categories[chip.$id];
        }

        // make form dirty
        form.$setDirty();
      }

      this.matchCompanyCategories = function () {
        var
          categoryId, i,
          companyCategories = [];

        for (categoryId in $scope.company.categories) {
          for (i = 0; i < $scope.categories.length; i++) {
            if (categoryId === $scope.categories[i].$id) {
              companyCategories.push($scope.categories[i]);
              break;
            }
          }
        }

        return companyCategories;
      }

      $scope.filterCategories = function (match) {
        var
          i,
          categoriesArray = []

        // filter
        for (i = 0; i < $scope.categories.length; i++) {
          if ($scope.categories[i].name.toLowerCase().indexOf(match.toLowerCase()) > -1) {
            categoriesArray.push($scope.categories[i]);
          }
        }

        return categoriesArray;
      }

      $scope.addCategory = function (category) {
        // add category id to company categories
        if (! $scope.company.categories) {
          $scope.company.categories = {}
        }

        $scope.company.categories[category.$id] = true;
      }

      $scope.setTimestamp = function (key, date) {
        // convert to timestamp
        $scope.company[key] = new Date(date).getTime();
      }

      this.setDate = function (key, timestamp) {
        $scope[key] = new Date(timestamp);
      }

      $scope.submit = function (form) {
        var notificationId;

        
        if (form.$valid) {
          $scope.status = 'submitting';

          // update company
          $scope.company.$save().then(function () {
            $scope.status = 'submitted';
            form.$setPristine();
          });

        } else {
          $scope.status = 'invalid';
        }

      }

    }]);

})(angular);