var
  express = require( "express" ),
  spdy = require( "spdy" ),
  jsdom = require( "jsdom" ),
  fs = require( "fs" );

var app = express();
var render = express.response.render;
var slice = Array.prototype.slice;
express.response.rendery = function( view, options, fn ){
  var
    req = this.req,
    self = this;

  if( "function" == typeof options ){
    fn = options;
    options = {};
  }
  fn = fn || function( err, content ){
    if( err ){
      return req.next( err );
    }
    var document = jsdom.html( content );
    var styles;
    try{
      styles = slice.call( document.querySelectorAll( "link[href][rel='stylesheet']" ) );
    }catch( x ){}

    if( styles && styles.length ){
      styles.forEach(function( style ){
        var src = style.getAttribute( "href" );
        console.log( "pushing %s", src );
        var s = self.push( src, {
          "Content-Type": "text/css"
        }, function( err, stream ){
          if( err ){
            return console.error( err );
          }
          stream.on( "error", console.error.bind( console ) );
          fs.createReadStream( src )
            .on( "error", console.error.bind( console ) )
            .pipe( stream );
        });
        s.on( "error", console.error.bind( console, "stream error" ) );
      });
    }

    var scripts;
    try{
      scripts = slice.call( document.querySelectorAll( "script[src]" ) );
    }catch( x ){}

    if( scripts && scripts.length ){
      scripts.forEach(function( script ){
        var src = script.getAttribute( "src" );
        console.log( "pushing", src );
        var s = self.push( src, {
          "Content-Type": "text/javascript"
        }, function( err, stream ){
          if( err ){
            return console.error( err );
          }
          stream.on( "error", console.error.bind( console ) );
          fs.createReadStream( src )
            .on( "error", console.error.bind( console ) )
            .pipe( stream );
        });
        s.on( "error", console.error.bind( console, "stream error" ) );
      });
    }
    try{
      // RELEASE THE KRAKEN and memory
      //document.parentWindow.close();
    }catch( x ){}
    self.send( content );
  };

  render.call( this, view, options, fn );
};


var options = {
  key: fs.readFileSync(__dirname + '/keys/spdy-key.pem'),
  cert: fs.readFileSync(__dirname + '/keys/spdy-cert.pem'),
  ca: fs.readFileSync(__dirname + '/keys/spdy-csr.pem')
};

app.set( "port", process.env.PORT || 3000 );
app.set( "views", __dirname + "/views" );
app.set( "view engine", "jade" );
app.use( express.favicon() );
app.use( express.logger( "dev" ) );
app.use( "/static", express.static( "./static") );
spdy.createServer(options, app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

app.get("/foo", function( req, res ){
  res.push( "static/jquery.js", {
    "Content-Type": "text/javascript"
  }, function( err, stream ){
    fs.createReadStream( "./static/jquery.js" )
      .pipe( stream );
  });
  res.render( "index" );
});