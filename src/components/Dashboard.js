import React from 'react'
import mapboxgl from 'mapbox-gl'
const Promise = require('bluebird')

Promise.promisifyAll(navigator.geolocation)

class Dashboard extends React.Component{

  constructor(){
    super()

    this.state = {
      markersCoord: [],
      map: {},
      mapDOMElement: '',
      data: {
        username: 'admin',
        email: 'admin',
        places: [
          {
            name: 'Machu Picchu',
            country: 'Peru',
            image: 'https://www.sungatetours.com/wp-content/uploads/2014/03/Panoramic-View-of-Machu-Pichu-Citadel.jpg',
            descriptLong: 'Machu Picchu is a 15th-century Inca citadel located in the Cusco Region, Peru, above the Sacred Valley. Most archaeologists believe that Machu Picchu was built as an estate for the Inca emperor Pachacuti (1438–1472). Often mistakenly referred to as the “Lost City of the Incas” (a title more accurately applied to Vilcabamba), it is the most familiar icon of Inca civilization. The Incas built the estate around 1450 but abandoned it a century later at the time of the Spanish Conquest. Although known locally, it was not known to the Spanish during the colonial period and remained unknown to the outside world until American historian Hiram Bingham brought it to international attention in 1911.',
            descriptShort: 'Machu Picchu is a 15th-century Inca citadel located in the Cusco Region, Peru, above the Sacred Valley',
            geog: [-13.1631, -72.5450]
          },
          {
            name: 'Uluru',
            country: 'Australia',
            image: 'https://cdn2.veltra.com/ptr/20161216103725_1899709985_13206_0.jpg?imwidth=550&impolicy=custom',
            descriptLong: 'Uluru is sacred to the Pitjantjatjara Anangu, the Aboriginal people of the area. The area around the formation is home to an abundance of springs, waterholes, rock caves and ancient paintings. Uluru is listed as a UNESCO World Heritage Site. Uluru and Kata Tjuta, also known as the Olgas, are the two major features of the Uluṟu-Kata Tjuṯa National Park.',
            descriptShort: 'Uluru, one of Australia\'s most recognisable natural landmarks is a large snadstone rock formation in the Northern Territory in central Austrilia',
            geog: [-25.2042, 131.0210]
          }
        ]
      }
    }
  }

  createMarkups(){
    console.log(this.markersCoord)
    this.markersCoord.forEach(geoCoord => {

      const markerDOM = document.createElement('img')
      markerDOM.setAttribute('class', 'marker')
      markerDOM.setAttribute('src', 'https://s1.qwant.com/thumbr/0x380/9/3/956b158d13001c1f57346b9fa0932fa2bc0aba7071bdc679d34e390524c1da/2000px-Map_marker.svg.png?u=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F8%2F88%2FMap_marker.svg%2F2000px-Map_marker.svg.png&q=0&b=1&p=0&a=1')

      const markers = new mapboxgl.Marker({element: markerDOM, anchor: 'bottom'})
        .setLngLat([String(geoCoord.lng), String(geoCoord.lat)])
        .addTo(this.map)
    })
  }

  createMap(){

    mapboxgl.accessToken = process.env.MAPBOX_KEY
    this.map = new mapboxgl.Map({
      container: this.mapDOMElement,
      style: 'mapbox://styles/mapbox/streets-v10',
      center: [0, 0],
      zoom: 1
    })

  }

  addUserLocalisation(markersCoord){
    let userLocation = []

    navigator.geolocation
      .getCurrentPositionAsync()
      .then(pos => userLocation = pos.coords)
      .catch(err => console.warn(err))

    if(userLocation) return markersCoord.unshift({lat: userLocation.latitude, lng: userLocation.longitude})
    else return markersCoord

  }

  getMarkersCoord(){
    this.markersCoord = this.state.data.places.map(place => {
      return ({lat: place.geog[0], lng: place.geog[1]})
    })
    return true
  }

  drawTrip(){

    let angle, opposite, adjacent, direction, move, animation
    // number of frames per longitude degree
    const speedFactor = 30
    // to store and cancel the animation
    let startTime = 0
    // progress = timestamp - startTime
    let progress = 0

    // Create a GeoJSON source with an empty lineString.
    const geojson = {
      'type': 'FeatureCollection',
      'features': [{
        'type': 'Feature',
        'geometry': {
          'type': 'LineString',
          //Starting point
          'coordinates': [
            [this.markersCoord[0].lng, this.markersCoord[0].lat]
          ]
        }
      }]
    }

    // add the line which will be modified in the animation
    this.map.addLayer({
      'id': 'line-animation',
      'type': 'line',
      'source': {
        'type': 'geojson',
        'data': geojson
      },
      'layout': {
        'line-cap': 'round',
        'line-join': 'round'
      },
      'paint': {
        'line-color': '#ed6498',
        'line-width': 5,
        'line-opacity': .8
      }
    })

    startTime = performance.now()

    //Calculate angle of the trajectory
    calculateAngleOfTrajectory()

    animateLine()

    function calculateAngleOfTrajectory(){
      opposite = this.markersCoord[1].lat - this.markersCoord[0].lat
      adjacent = this.markersCoord[1].lng - this.markersCoord[0].lng
      angle = Math.atan(opposite / adjacent)
      direction = this.markersCoord[1].lng - this.markersCoord[0].lng > 0 ? 'east' : 'west'
    }

    function animateLine(timestamp) {

      progress = timestamp - startTime

      if(direction === 'east'){
        move = progress / speedFactor
      } else if(direction === 'west') {
        move = - progress / speedFactor
      }

      var x = move +  this.markersCoord[0].lng || this.markersCoord[0].lng // initial point
      // draw a sine wave with some math.
      var y = (x - this.markersCoord[0].lng)  * Math.tan(angle) + this.markersCoord[0].lat|| this.markersCoord[0].lat
      // append new coordinates to the lineString
      geojson.features[0].geometry.coordinates.push([x, y])
      // then update the map
      this.map.getSource('line-animation').setData(geojson)

      // Request the next frame of the animation.
      if(x > this.markersCoord[1].lng && direction === 'east' || x < this.markersCoord[1].lng && direction === 'west'){
        this.markersCoord.shift()
        if(this.markersCoord.length < 2) return
        startTime = timestamp
        calculateAngleOfTrajectory()
      }
      animation = requestAnimationFrame(animateLine)
    }

  }

  componentDidMount(){

    this.getMarkersCoord()
      .then(() => this.addUserLocalisation())
      .then(() => this.createMap())
      .then(() => this.createMarkups())
      .then(() => this.map.on('load', () => this.drawTrip()))

  }

  render(){
    return(
      <div id='map' ref={element => this.mapDOMElement = element}/>
    )
  }
}

export default Dashboard
