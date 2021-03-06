angular
.module('myApp')
.service('joinForCompanyService', [
  '$timeout',
  'FBURL',
  function($timeout, FBURL) {

    var
      executeCallback,
      checkPending,
      onCompanyChange,
      onCategoryChange,
      onTaskChange,
      onNotificationChange,
      self = this,
      pending = {
        requests: 0,
        incr: function(where) {
          // console.log(where, pending.requests, '++')
          pending.requests++;
        },
        decr: function (where) {
          if (pending.requests > 0) {
            // console.log(where, pending.requests, '--')

            pending.requests--;

            if (pending.requests === 0) {
              executeCallback();
            }
          }
        }
      },
      fburl = {
        company: function(id) {return FBURL + '/companies/' + id},
        category: function (id) {return FBURL + '/categories/' + id},
        task: function (id) {return FBURL + '/tasks/' + id},
        notification: function (id) {return FBURL + '/notifications/' + id},
      },
      fbref = {
        company: null,
        categories: {},
        tasks: {},
        notifications: {},
      //   clear: function (refSets) {
      //     var i, j, key, refSet;

      //     // each set
      //     for (i in refSets) {
      //       key = refSets[i];
      //       refSet = fbref[key];

      //       if (refSet) {
      //         for (j in refSet) {
      //           //console.log(j)
      //         }
      //       }

      //     }
      //   }
      },
      company = {};

    this.deferExe;

    onCompanyChange = function (snap) {
      company = snap.val();

      // kill all fb refs bellow company
      // fbref.clear(['categories', 'tasks', 'notifications']);
      // fbref.categories = {};
      // fbref.tasks = {};
      // fbref.notifications = {};

      if ( snap.child('categories').exists() ) {
        snap.child('categories').forEach(function (category) {
          var
            categoryId = category.key(),
            categoryUrl = fburl.category(categoryId);

          // increment pending requests
          pending.incr('category');

          // ref
          fbref.categories[categoryId] = new Firebase(categoryUrl);

          // listener
          fbref.categories[categoryId].once('value', function (snap) {
            onCategoryChange(snap);

            // decrement pending requests
            pending.decr('category');
          });
        });
      }
    }

    onCategoryChange = function (snap) {

      //console.log('onCategoryChange', pending.requests)

      var
        categoryId = snap.key(),
        categories = company.categories;

      // kill all fb refs bellow categories
      // fbref.clear(['tasks', 'notifications']);
      // fbref.tasks = {};
      // fbref.notifications = {};

      categories[categoryId] = snap.val();

      if ( snap.child('tasks').exists() ) {
        snap.child('tasks').forEach(function (task) {
          var
            taskId = task.key(),
            taskUrl = fburl.task(taskId);

          // increment pending requests
          pending.incr('taks');

          // ref
          fbref.tasks[taskId] = new Firebase(taskUrl);

          // listener
          fbref.tasks[taskId].once('value', function (snap) {
            onTaskChange(snap, categories[categoryId])

            // decrement pending requests
            pending.decr('task');
          });
        })
      }
    }

    onTaskChange = function (snap, category) {
      //console.log('onTaskChange', pending.requests)
      var
        notifications, newestNotificaionId, notificationUrl,
        taskId = snap.key(),
        tasks = category.tasks;

      // kill all fb refs bellow task
      // fbref.clear(['notifications']);
      // fbref.notifications = {};

      tasks[taskId] = snap.val();

      if ( snap.child('notifications').exists() ) {

        // get newest (= last) child
        notifications = snap.child('notifications').val();
        newestNotificaionId = Object.keys(notifications).slice(-1)[0];
        notificationUrl = fburl.notification(newestNotificaionId);

        // increment pending requests
        pending.incr('notification');

        // ref
        fbref.notifications[newestNotificaionId] = new Firebase(notificationUrl);

        // query
        fbref.notifications[newestNotificaionId].once('value', function (snap) {
          onNotificationChange(snap, tasks[taskId])
          
          // decrement pending requests
          pending.decr('notification');
        });

      }
    }

    onNotificationChange = function (snap, task) {
      //console.log('onNotificationChange', pending.requests)
      var
        timestamp = snap.child('timestamp').val(),
        now = new Date().getTime();

      // find out if notification is new enough to display
      // 60 days
      if (timestamp > now - 60*24*60*60*1000)
      {
        task.notification = snap.val();
      }
    }

    executeCallback = function () {
      // defer the callback since there will be multiple callbacks otherwise
      ! self.deferExe || $timeout.cancel(self.deferExe);

      self.deferExe = $timeout(function () {
        //console.log('exe', pending.requests)
        self.callback(company);
      });
    }


    checkPending = function () {
      //console.log(pending.requests)
      if (pending === 0) {
        executeCallback();
      }
    }


    this.watch = function (companyId, callback) {
      this.callback = callback;

      // fetch
      fbref.company = new Firebase(fburl.company(companyId));

      // increment pending requests
      pending.incr('company');

      // initiate process
      fbref.company.once('value', function (snap) {
        onCompanyChange(snap);

        // decrement pending requests
        pending.decr('company');
      });
    }

  }]);