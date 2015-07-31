angular
.module('myApp')
.factory('deleteTaskFactory', [
  '$q',
  'AwaitFactory',
  'FBURL',
  function($q, AwaitFactory, FBURL) {

    var deleteTask, deleteNotifications, removeActivitiesReference, removeCategoryReference, mainAwait, deffered;

    // so we will ba able to use .then
    deffered = $q.defer();

    // function which makes sure .then is fired when everything is done and not before
    mainAwait = new AwaitFactory(function () {
      deffered.resolve();
    });
 
    deleteTask = function (taskId) {
      var taskRef = new Firebase(FBURL + '/tasks/' + taskId);

      taskRef.remove(function () {
        mainAwait.decr('deleteTask');
      });
    }

    deleteNotifications = function (taskId) {
      var awaitNotifications, notificationsRef;

      notificationsRef = new Firebase(FBURL + '/notifications');

      awaitNotifications = new AwaitFactory(function () {
        mainAwait.decr('deleteNotifications');
      });

      // filter
      notificationsRef = notificationsRef
      .orderByChild('taskId')
      .equalTo(taskId);

      // fetch data
      notificationsRef.once('value', function (snap) {
        if (snap.numChildren()) {

          snap.forEach(function (snap) {

            // inrease awaiting request
            awaitNotifications.incr('notification');

            // remove notification
            snap.ref().remove(function () {

              // decrease awaiting requests
              awaitNotifications.decr('notification');

            });
          });

        } else {
          // if no notifications exist we wanna resolve this one
          awaitNotifications.tryResolve();
        }
      })
    }

    removeCategoryReference = function (taskId) {
      var awaitCategories, categoriesRef, noReferences;

      categoriesRef = new Firebase(FBURL + '/categories');

      awaitCategories = new AwaitFactory(function () {
        mainAwait.decr('removeCategoryReference')
      });

      // if there is no reference to the task from the categories
      noReferences = true;

      categoriesRef.once('value', function (snap) {
        if (snap.hasChildren()) {

          snap.forEach(function (snap) {
            if (snap.hasChild('tasks/' + taskId)) {
              noReferences = false;

              // incr
              awaitCategories.incr('category');

              // remove task reference from category
              snap.child('tasks/' + taskId).ref().remove(function () {

                // decr
                awaitCategories.decr('category');

              });
            }

          });

          // will not touch any incr() or decr() of awaitcategories
          // this condition will be checked after the loop obviously
          if (noReferences) {
            awaitCategories.tryResolve();
          }

        } else {
          awaitCategories.tryResolve();
        }
      });
    }

    removeActivitiesReference = function (taskId) {
      var awaitActivities, activitiesRef, noReferences;

      activitiesRef = new Firebase(FBURL + '/activities');

      awaitActivities = new AwaitFactory(function () {
        mainAwait.decr('removeActivitiesReference')
      });

      // if there is no reference to the task from the categories
      noReferences = true;

      activitiesRef.once('value', function (months) {

        // months
        if (months.hasChildren()) {

          months.forEach(function (month) {

            // a month will not exist without company activities inside
            month.forEach(function (company) {

              if (company.hasChild(taskId)) {
                noReferences = false;

                // incr
                awaitActivities.incr('activities');

                // remove task reference from activities
                company.child(taskId).ref().remove(function () {

                  // decr
                  awaitActivities.decr('activities');

                });
              }
            });
          });

          // will not touch any incr() or decr() of awaitActivities
          // this condition will be checked after the loop obviously
          if (noReferences) {
            awaitActivities.tryResolve();
          }

        } else {
          awaitActivities.tryResolve();
        }
      });
    }


    return function (taskId) {

      mainAwait.incr('deleteTask');
      deleteTask(taskId);

      mainAwait.incr('deleteNotifications');
      deleteNotifications(taskId);

      mainAwait.incr('removeCategoryReference');
      removeCategoryReference(taskId);

      mainAwait.incr('removeActivitiesReference');
      removeActivitiesReference(taskId);


      return deffered.promise;
    }



  }]);