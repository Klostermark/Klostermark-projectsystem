angular
.module('myApp')
.factory('deleteCategoryFactory', [
  '$timeout',
  '$q',
  'AwaitFactory',
  'FBURL',
  function($timeout, $q, AwaitFactory, FBURL) {

    var deleteCategory, removeTasksReference, removeCompanyReference, mainAwait, deffered;

    // so we will ba able to use .then
    deffered = $q.defer();

    // function which makes sure .then is fired when everything is done and not before
    mainAwait = new AwaitFactory(function () {
      deffered.resolve();
    });
 
    deleteCategory = function (categoryId) {
      var categoryRef = new Firebase(FBURL + '/categories/' + categoryId);

      categoryRef.remove(function (res) {
        mainAwait.decr('deleteCategory');
      });
    }

    removeTasksReference = function (categoryId) {
      var awaitTasks, tasksRef;

      tasksRef = new Firebase(FBURL + '/tasks');

      awaitTasks = new AwaitFactory(function () {
        mainAwait.decr('removeTasksReference');
      });

      // filter
      tasksRef = tasksRef
      .orderByChild('category')
      .startAt(categoryId)
      .endAt(categoryId);

      // fetch data
      tasksRef.once('value', function (snap) {
        if (snap.numChildren()) {

          snap.forEach(function (snap) {

            // inrease awaiting request
            awaitTasks.incr('task');

            // remove category from task
            snap.child('category').ref().remove(function () {

              // decrease awaiting requests
              awaitTasks.decr('task');

            });
          });

        } else {
          // if no tasks exist we wanna resolve this one
          awaitTasks.tryResolve();
        }
      });
    }

    removeCompanyReference = function (categoryId) {
      var awaitCompanies, companiesRef, noReferences;

      companiesRef = new Firebase(FBURL + '/companies');

      awaitCompanies = new AwaitFactory(function () {
        mainAwait.decr('removeCompanyReference')
      });

      // if there is to the task from the companies
      noReferences = true;

      // filter
      companiesRef = companiesRef
      .orderByChild('categories')

      companiesRef.once('value', function (snap) {
        if (snap.hasChildren()) {

          snap.forEach(function (snap) {
            if (snap.hasChild('categories/' + categoryId)) {
              noReferences = false;

              // incr
              awaitCompanies.incr('company');

              // remove category from company
              snap.child('categories/' + categoryId).ref().remove(function () {

                // decr
                awaitCompanies.decr('company');

              });
            }

          });

          // will not touch the any incr() or decr() of awaitingCompanies
          // this condition will be checked after the loop obviously
          if (noReferences) {
            awaitCompanies.tryResolve();
          }

        } else {
          awaitCompanies.tryResolve();
        }
      });
    }


    return function (categoryId) {

      mainAwait.incr('deleteCategory');
      deleteCategory(categoryId);

      mainAwait.incr('removeTasksReference');
      removeTasksReference(categoryId);

      mainAwait.incr('removeCompanyReference');
      removeCompanyReference(categoryId);

      return deffered.promise;
    }



  }]);