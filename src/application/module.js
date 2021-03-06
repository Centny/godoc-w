angular.module('app', ['tmpl', 'platypus.jsonviewer'])
    .config(function($httpProvider) {
        $httpProvider.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';
    })
    .controller('mainCtrl', function($scope, $rootScope, $http, $timeout, connector, config) {
        $rootScope.backPage = function(ev) {
            history.go(-1);
            if (ev) {
                ev.stopPropagation();
            }
        };

        function getSch() {
            var sch = window.location.search;
            if (sch && !/\/$/.test(sch)) {
                sch += '/';
            }
            return sch;
        }

        function hashchange() {
            var sch = getSch();
            var hash = window.location.hash;
            var has = hash || $rootScope.appData.curLocation;
            if (has && $rootScope.appData.curLocation !== hash) {
                $rootScope.appData.curLocation = hash;
                if (hash) {
                    window.location.href = (sch || '/') + hash;
                }
                try {
                    $rootScope.$digest();
                } catch (e) {}
            }
        }

        window.removeEventListener('hashchange', hashchange, false);
        window.addEventListener('hashchange', hashchange, false);

        function init(rs) {
            $rootScope.appData = rs;
            hashchange();
            var timer = $timeout(function() {
                var sch = getSch();
                if (window.location.hash) {
                    window.location.href = (sch || '/') + window.location.hash;
                }
                $timeout.cancel(timer);
            }, 200);
        }

        var appTestData = window.appTestData;

        function getDoc(params) {
            loadingLayer.in();
            connector.getDoc(params).then(function(rs) {
                loadingLayer.out();
                init(rs);
            }, function(err) {
                loadingLayer.out();
                console.error(err);
                if (appTestData) {
                    init(appTestData);
                } else {
                    alert('请求失败');
                }
            });
        }

        function getSearch() {
            var o;
            var s = window.location.search.substring(1, window.location.search.length);
            if (s) {
                s = s.replace(/\/$/, '');
            }
            var a = [];
            if (s) {
                a = s.split('&');
                o = {};
                angular.forEach(a, function(v, k) {
                    var i = v.split('=');
                    o[i[0]] = decodeURI(i[1]);
                });
            }
            return o;
        }

        getDoc(getSearch());

        $rootScope.getSearch = getSearch;
        $rootScope.getDoc = getDoc;

    })
    .factory('config', function() {
        var ip = {
            doc: '/doc/case/data',
        };
        return {
            ip: function(k) {
                return ip[k || 'sso'];
            },
            uid: function() {
                return 0;
            },
            token: function() {
                return '';
            },
            getDefaultParams: function() {
                var _this = this;
                return {};
            }
        };
    })
    .factory('request', function($http, $q) {
        return function(option) {
            return $http(option).then(function(response) {
                var defer = $q.defer();
                if ('code' in response.data) {
                    if (angular.isUndefined(response.data.code)) {
                        defer.reject({
                            type: -1,
                            data: response
                        });
                    } else if (response.data.code !== 0) {
                        defer.reject({
                            type: 1,
                            data: response
                        });
                    } else {
                        // console.log(response.data);
                        defer.resolve(response.data);
                    }
                } else {
                    defer.resolve(response.data);
                }
                return defer.promise;
            }, function(err) {
                throw {
                    type: -1,
                    data: err
                };
            });
        };
    })
    .factory('connector', function($rootScope, request, config) {

        function getDefaultOption(params, method, api) {
            var p = config.getDefaultParams();
            return {
                method: method,
                url: config.ip + 'api.php/' + api,
                params: method === 'GET' ? angular.extend(p, params) : undefined,
                data: method === 'POST' ? $.param(angular.extend(p, params)) : undefined
            };
        }

        function http(params, filter, method, api) {
            var option = getDefaultOption(params, method, api);
            return request(angular.extend(option, filter));
        }
        return {
            getDoc: function(params, filter) {
                var d = {
                    url: config.ip('doc')
                };
                return http(params, angular.extend(d, filter || {}), 'GET', '');
            }
        };
    })
    .filter("dateFormat", function() {
        return function(text) {
            return moment(text).format('MMMM Do YYYY, h:mm:ss a');
        };
    });