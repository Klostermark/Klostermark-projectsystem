angular
.module('myApp')
.factory('confirmFactory', [
  '$mdDialog',
  function($mdDialog) {

    return function (data) {

      return $mdDialog.show({
        templateUrl: 'templates/dialogs/confirm.html',
        parent: angular.element(document.body),
        locals: {
          message: data.message,
          query: data.query,
        },
        controller: 'ConfirmCtrl'
      })

    }

  }]);