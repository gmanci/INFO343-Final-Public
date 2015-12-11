'use strict';

var SOUNDCLOUD_BASE_URL = 'https://api.soundcloud.com';
var SOUNDCLOUD_CLIENT_ID = '3a0c15409a6b0e2610d61620155a549c';

var FACEBOOK_APP_ID = '1676203739293367';

var app = angular.module("localSoundApp", ['ngSanitize', 'firebase', "ui.router", 'ngCookies']);

app.config(function($stateProvider, $urlRouterProvider){
    $urlRouterProvider.otherwise('/');
	$stateProvider
	    .state('index', {
	        url: '/',
			templateUrl: "templates/home.html"
	    })
        .state('profile', {
            url: '/profile',
            templateUrl: "templates/profile.html"
        })
        .state('events', {
            url: '/events',
            templateUrl: "templates/events.html"
        })
        .state('signup', {
            url: '/signup',
            templateUrl: "templates/signup.html"
        })
        .state('login', {
            url: '/login',
        templateUrl: "templates/login.html"
        })
}).controller("localSoundCtrl", ['$scope', '$http', '$sce', '$window', '$cookies', 'Profile', '$firebaseArray', function ($scope, $http, $sce, $window, $cookies, Profile, $firebaseArray) {
    
    var authRef = new Firebase('https://localsound.firebaseio.com/web/uauth');
    var ref = new Firebase('https://localsound.firebaseio.com');
    
    $scope.sortReverse  = false;  // resets/initilizes the default sort order
    $scope.isVisible = []; // resets/initilizes the array for show buttons
    $scope.isHidden = [];
    $scope.hasVoted = [];// resets/initilizes the array for hide buttons
    $scope.seletedIndex = -1; // resets/initilizes the username selected
    $scope.isLoggedIn = $cookies.getObject('firebaseAuth') != null ? true : false; //resets/intitilzes logged in trigger

    
        
    $scope.posts = [];
    var firePosts = $firebaseArray(ref.child("Posts"));
    firePosts.$loaded().then(function(x) {
        angular.forEach(firePosts, function(data, index) {
            var profile = Profile(data.uid)
            profile.$loaded().then(function(response) {
                data.username = profile.username;
                data.avatar = profile.avatarUrl;
            });
            $scope.posts.push(data);
        });
        //Initializes Show and hide for posts
        for (var i=0; i<$scope.posts.length; i++) {
            $scope.isVisible[i] = true; 
            $scope.hasVoted[i] = false;
            console.log($scope.hasVoted);
        }
    })
    .catch(function(error) {
        console.log("Error:", error);
    });


    
    //Adds post to firebase
    $scope.addPost = function() {
        $scope.inputLink = document.getElementById("scLink").value;
        var authData = $cookies.getObject('firebaseAuth');
        ref.child("Posts").$add({
            uid: authData.uid,
            rating: 0,
            soundcloud_url: $scope.inputLink,
            dateTime: Date()

        }, function(error, eData) {
            if(error) {
                console.log(error);
            } else {
                console.log("Success");
            }
        })
    }
      
    //TODO: Add upvote functionality to featured posts
    $scope.upVote = function(postId, index) {
        var post = firePosts.$getRecord(postId);
        console.log(postId);
        post.rating += 1;
        firePosts.$save(post);
        $scope.hasVoted[index] = true;
    }
    
    //TODO: Add downvote functionality to featured posts
    $scope.downVote = function(postId, index) {
        var post = firePosts.$getRecord(postId);
        post.rating -= 1;
        firePosts.$save(post);
        $scope.hasVoted[index] = true;
    }
    
    $scope.login = function(email, password) {     
        authRef.authWithPassword({
            email: email,
            password: password
        }, function(error, authData) {
            if(error) {
                console.log("Login Failed!", error);
                deffered.reject(error);
            } else {
    
                $cookies.putObject('firebaseAuth', authData);
                $scope.isLoggedIn = true;
                $scope.$apply();
                $window.location.href = 'index.html#/';
            }
        });  
    }
    
    $scope.logout = function() {
        authRef.unauth();
        $cookies.remove('firebaseAuth');
        $window.location.href = 'index.html/';
    }
    
    //Loads featured info
    $scope.loadInfo = function($index) {
    	$scope.selectedIndex = $index;
    	var id = $scope.posts[$index].soundcloud_url;

    	//Shows or hides SoundCloud player depending on what button was pressed
        if($scope.isVisible[$index]) {
    		var src = "https://w.soundcloud.com/player/?url=" + id + "&amp;auto_play=false&amp;hide_related=false&amp;show_comments=false&amp;show_user=true&amp;show_reposts=false&amp;visual=true";
    		$scope.player = '<iframe width="100%" height="350" scrolling="yes" frameborder="no"  src=' + src + '></iframe>'
    		$scope.trustPlayer = $sce.trustAsHtml($scope.player);
    	} else {
    		$scope.trustPlayer = $sce.trustAsHtml('');
    	}
    	$scope.isVisible[$index] = !$scope.isVisible[$index];
		$scope.isHidden[$index] = !$scope.isHidden[$index];
    }

    $scope.showModal = false;
    $scope.toggleModal = function () {
        $scope.showModal = !$scope.showModal;
    }


}])
.controller("signupCtrl", ['$scope', '$window', function($scope, $window) {

    var ref = new Firebase('https://localsound.firebaseio.com/Profiles');
    
    $scope.confirmPassword = "";
    $scope.registrationInfo = {};   
    
    $scope.passwordMatch = function() {
        
        if(($scope.registrationInfo.password == $scope.confirmPassword) || $scope.confirmPassword == "") {
            return true;
        } else {
            false
        }
    }
    
    $scope.createProfileData = function(authData) {
        delete $scope.registrationInfo.password;
        $scope.registrationInfo.posts = {};
        ref.child(authData.uid).set($scope.registrationInfo);
    }
    
    $scope.register = function() {
        ref.createUser({
            email: $scope.registrationInfo.email,
            password: $scope.registrationInfo.password
        }, function(error, authData) {
            if(error) {
                console.log(error);
            } else {
                console.log("Success");
                $scope.createProfileData(authData);
                $window.location.href = '#/login';
            }
        })
    }



}])
.controller('profileCtrl', ['$scope', '$cookies', 'Profile', function($scope, $cookies, Profile) {
    var authData = $cookies.getObject('firebaseAuth');
    var profile = Profile(authData.uid)
    $scope.user = profile
    profile.$loaded().then(function(response) {
          console.log($scope.user.email);
    });
  
    
    $scope.saveProfile = function() {
      $scope.user.$save().then(function() {
        alert('Profile saved!');
      }).catch(function(error) {
        alert('Error!');
      });
    };
    
}])
.controller("newEventCtrl", ['eventData', '$scope', '$firebaseObject', function(eventData, $scope, $firebaseObject) {


    var ref = new Firebase('https://localsound.firebaseio.com/Events');
    
    $scope.eventObject = {};   
    
    $scope.createEvent = function() {
        ref.push({
            city: $scope.eventObject.city,
            title: $scope.eventObject.title,
            body: $scope.eventObject.body,
            dateTime: $scope.eventObject.dateTime.toString(),
            link: $scope.eventObject.link,
            duration: $scope.eventObject.duration
        }, function(error, eData) {
            if(error) {
                console.log(error);
            } else {
                console.log("Success");
            }
        })
    }
    
//    $scope.events1 = eventData;
//    eventData.$loaded().then(function() {
//        angular.forEach($scope.events1, function(event, index) {
//            
//        }
//    }
    
    
    
    ref.on("value", function(snapshot) {
        $scope.eventArray = (snapshot.val());
        console.log($scope.eventArray);
//        for (Object in eventArray) {
//            $('#eventList').append("<div id='title'>" + Object.title + "</div>");
//        }
    }, function (errorObject) {
        console.log("The read failed: " + errorObject.code);
    });
    
    /* create a $firebaseArray for the event reference and add to scope */
	$scope.events = $firebaseObject(ref);
}])
.directive('modal', function () {
    return {
        template: '<div class="modal fade">' + 
            '<div class="modal-dialog">' + 
              '<div class="modal-content">' + 
                '<div class="modal-header">' + 
                  '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>' + 
                  '<h4 class="modal-title">{{ title }}</h4>' + 
                '</div>' + 
                '<div class="modal-body" ng-transclude></div>' + 
              '</div>' + 
            '</div>' + 
          '</div>',
        restrict: 'E',
        transclude: true,
        replace:true,
        scope:true,
        link: function postLink(scope, element, attrs) {
            scope.title = attrs.title;

            scope.$watch(attrs.visible, function(value){
                if(value == true)
                    $(element).modal('show');
                else
                    $(element).modal('hide');
            });

            $(element).on('shown.bs.modal', function(){
                scope.$apply(function(){
                    scope.$parent[attrs.visible] = true;
                });
            });

            $(element).on('hidden.bs.modal', function(){
                scope.$apply(function(){
                    scope.$parent[attrs.visible] = false;
                });
            });
        }
    }})
.factory("Profile", ["$firebaseObject",function($firebaseObject) {
    return function(id) {
      // create a reference to the database node where we will store our data
      var ref = new Firebase("https://localsound.firebaseio.com/Profiles");
      var profileRef = ref.child(id);

      // return it as a synchronized object
      return $firebaseObject(profileRef);
    }
  }
])
.factory('eventData', ['$firebaseArray', function($firebaseArray){
        var myFirebaseRef = new Firebase("https://localsound.firebaseio.com/Events");
        var eventRef = myFirebaseRef.push();

        return $firebaseArray(eventRef);
}])
.factory('eventData', ['$firebaseArray', '$scope', function($firebaseArray, $scope){
    var myFirebaseRef = new Firebase("https://localsound.firebaseio.com/Events");
    var ref = myFirebaseRef.push();
    
    ref.on("value", function(snapshot) {
    $scope.eventArray = (snapshot.getValue());
    console.log($scope.eventArray);
//        for (Object in eventArray) {
//            $('#eventList').append("<div id='title'>" + Object.title + "</div>");
//        }
    }, function (errorObject) {
        console.log("The read failed: " + errorObject.code);
    });
    
    return $firebaseArray(ref);

}])
.filter('fDate', [
    '$filter', function($filter) {
        return function(input, format) {
            return $filter('date')(new Date(input), format);
        };
    }
]);