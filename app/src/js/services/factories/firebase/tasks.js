angular
.module('myApp')
.factory('tasksFactory', [
  'fbutil',
  '$firebaseArray',
  '$firebaseObject',
  'FBURL',
  function(fbutil, $firebaseArray, $firebaseObject, FBURL) {


    var
      refTasks = new Firebase(FBURL + '/tasks'),
      methods = {};

    methods.all = function () {
      return $firebaseArray(refTasks);
    }

    methods.get = function (id) {
      return $firebaseObject(refTasks.child(id));
    }

    return methods;

  }]);