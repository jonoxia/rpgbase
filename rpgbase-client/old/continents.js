
function RandomCaveGenerator( height, width, noduleDensity) {
    // maybe something more like a worm that bores through rock, randomly changes directions, sometimes splits up
    // then distribute nudules and crudules around randomly
}


function RandomLandmassGenerator( height, width, noise, volcanic, erosion, sea, faults ) {
    this.height = height;
    this.width = width;
    this.noise = noise;
    this.volcanic = volcanic;
    this.erosion = erosion;
    this.seaLevel = sea;
    this.faults = faults;
    this.bigArray = [];
    let x, y;
    for (y = 0; y < height; y++) {
	this.bigArray.push( [] );
	for (x = 0; x < width; x++) {
	    this.bigArray[y][x] = 0;
	}
    }
}
RandomLandmassGenerator.prototype = {
    smooth: function (numTimes ) {
        let x, y;
        for (let t = 0; t < numTimes; t++) {
	    let newBigArray = [];
	    for (y = 0; y < this.height; y++) {
		newBigArray.push( [] );
		for ( x = 0; x < this.width; x++) {
		    let cellsToAvg = [];
		    if ( x > 0 ) {
			cellsToAvg.push( this.bigArray[y][x-1] );
		    } else {
			cellsToAvg.push( this.bigArray[y][this.width-1] );
		    }

		    if (x < this.width - 1) {
			cellsToAvg.push( this.bigArray[y][x+1] );
		    } else {
			cellsToAvg.push( this.bigArray[y][0] );
		    }

		    if ( y > 0 ) {
			cellsToAvg.push( this.bigArray[y-1][x] );
		    } else {
			cellsToAvg.push( this.bigArray[this.height-1][x] );
		    }

		    if (y < this.height - 1) {
			cellsToAvg.push( this.bigArray[y+1][x] );
		    } else {
			cellsToAvg.push( this.bigArray[0][x] );
		    }
		    cellsToAvg.push( this.bigArray[y][x]);
		    let total = 0;
		    for ( let z in cellsToAvg ) {
			total += cellsToAvg[z];
		    }
		    let avg = total / cellsToAvg.length;
		    newBigArray[y][x] = avg;
		}
	    }
	    this.bigArray = newBigArray;
	}
    },

    fault: function(amplitude, length, numTimes ) {
	let x, y, z, dx, dy, duration;
	for (let t= 0; t< numTimes; t++) {
	    x = Math.random() * this.width;
	    y = Math.random() * this.height;
	    z = amplitude * (Math.random() - 0.5);
	    dx = 2* (Math.random() - 0.5);
	    dy = 2 * (Math.random() - 0.5);
	    duration = length * ( Math.random() * 20 + Math.random() * 20 );
	    for (let i = 0; i < duration; i ++ ) {
		let intx = parseInt(Math.floor(x));
		let inty = parseInt(Math.floor(y));
		if (intx > this.width - 1) {
		    intx = this.width - 1;
		}
		if (inty > this.height - 1) {
		    inty = this.height - 1;
		}
		if (intx < 0 ) {
		    intx = 0;
		}
		if (inty < 0 ) {
		    inty = 0;
		}
		this.bigArray[inty][intx] = this.bigArray[inty][intx] + z;
		x += dx;
		y += dy;
		if (x < 0 ) {
		    x += this.width;
		}
		if (x > this.width -1 ) {
		    x -= this.width;
		}
		if (y < 0 ) {
		    y += this.height;
		}
		if (x > this.width -1 ) {
		    y -= this.height;
		}
	    }
	}
    },
    
    spike: function(amplitude, numTimes ) {
	let x, y, z;
	
	for (let t= 0; t< numTimes; t++) {
	    x = Math.floor( Math.random() * this.width );
	    y = Math.floor( Math.random() * this.height );
	    z = amplitude * (Math.random() - 0.5);
	    this.bigArray[y][x] = this.bigArray[y][x] + z;
	}
    },
    
    shake: function( amplitude ) {
	let x, y, z;
	for (y = 0; y < this.height; y++) {
	    for (x = 0; x < this.width; x++) {
		this.bigArray[y][x] += amplitude * (Math.random() - 0.5);
	    }
	}
    },
    
    bias: function( amplitude ) {
	let x, y, z;
	for (y = 0; y < this.height; y++) {
	    for (x = 0; x < this.width; x++) {
		this.bigArray[y][x] += amplitude;
	    }
	}
    },
    
    getArray: function() {
	this.fault( this.faults, 3 * this.faults, 5 * this.faults );
	this.shake( 2 * this.noise);
	this.spike( 100 * this.volcanic, 2 * this.volcanic);
	this.smooth( 20 * this.erosion);
	this.shake( 1 * this.noise);
	this.spike( 20 * this.volcanic, 10 * this.volcanic);
	this.smooth( 10 * this.erosion);
	this.shake( 0.5 * this.noise);
	this.spike( 10 * this.volcanic, 20 * this.volcanic);
	this.fault( this.faults, this.faults, 20 * this.faults );
	this.smooth( 5 * this.erosion);
	this.spike( 5 * this.volcanic, 50 * this.volcanic);
	this.smooth( 2 * this.erosion);
	this.spike( 1 * this.volcanic, 100 * this.volcanic);
	this.smooth( 1 * this.erosion);
	
	// Bias based on sea level:
	this.bias( (1.0 - this.seaLevel));
	
	return this.bigArray;
    }
};
