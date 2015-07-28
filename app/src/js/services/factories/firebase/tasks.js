angular
.module('myApp')
.factory('tasksFactory', [
  'fbutil',
  '$firebaseArray',
  '$firebaseObject',
  'FBURL',
  function(fbutil, $firebaseArray, $firebaseObject, FBURL) {


    var
      url = FBURL + '/tasks',
      ref = new Firebase(url),
      methods = {};

    methods.all = function () {
      return $firebaseArray(ref);
    }

    methods.get = function (id) {
      return $firebaseObject(ref.child(id));
    }

    methods.update = function (id, data) {
      return ref.child(id).set(data);
    }

    return methods;

  }]);