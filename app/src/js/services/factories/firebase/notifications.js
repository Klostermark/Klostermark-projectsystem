angular
.module('myApp')
.factory('notificationsFactory', [
  'fbutil',
  '$firebaseArray',
  '$firebaseObject',
  'FBURL',
  function(fbutil, $firebaseArray, $firebaseObject, FBURL) {


    var
      refNotifications = new Firebase(FBURL + '/notifications'),
      methods = {};

    methods.push = function (data) {
      var ref = refNotifications.push(data);
      // return generated id
      return ref.path.pieces_[1];
    }

    return methods;

  }]);