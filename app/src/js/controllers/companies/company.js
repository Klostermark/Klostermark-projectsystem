require('controllers/companies/index.js');

(function (angular) {
  "use strict";

  angular
  .module('myApp.companies')
  .controller('CompanyCtrl', [
    '$scope',
    '$routeParams',
    'joinForCompanyService',
    function($scope, $routeParams, joinForCompanyService) {

      var
        self = this,
        companyId = $routeParams.id;
      
      $scope.company = {};
      
      joinForCompanyService.watch(companyId, function (company) {
        $scope.company = company;
        !! $scope.$$phase || $scope.$apply();
      })        

    }]);

})(angular);