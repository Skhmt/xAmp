/*jshint
esversion: 6,
node: true
*/

const fs = require('fs')

let ytPlayer

let data = {
	vidQueue: [],
	currentVid: {
		id: 'XIMLoLxmTDw',
		title: 'xAmp',
	},
	currentTime: '00:00',
	duration: '00:00',
	vidInput: '',
	blockScrub: false,
	blockVol: false,
	selected: null,
	el: {
		video_ad: undefined,
		scrub: undefined,
		scrubContainer: undefined,
		volumeContainer: undefined,
		queueContainer: undefined,
		queueButtons: undefined,
		volume: undefined,
		pp: undefined,
		body: document.getElementsByTagName('body')[0],
		drag: undefined,
		mainContent: undefined,
		ytCover: undefined,
		ytPlayer: undefined,
	},
	refreshed: false,
	isDragging: false,
	hideVid: false,
	hideQueue: false,
}

const loadQueue = localStorage.getItem('vidQueue')
if (loadQueue) data.vidQueue = JSON.parse(loadQueue)

let vm = new Vue({
	el: '#app',
	data,
	methods: {
		next () {
			clearSelected()
			nextVid()
		},
		prev () {
			clearSelected()
			prevVid()
		},
		shuffle () {
			clearSelected()

			this.vidQueue = shuffle(this.vidQueue)
			saveQueue()
		},
		add () {
			clearSelected()

			addVid(this.vidInput)
			this.vidInput = ''
		},
		remove: deleteSelected,
		close () {
			nw.App.quit()
		},
		minimize () {
			nw.Window.get().minimize()
		},
		select (ind) {
			select(ind)
		},
		up: upSelected,
		down: downSelected,
		clear: clearSelected,
		save () {
			document.getElementById('saveFile').click()
		},
		open () {
			document.getElementById('openFile').click()
		},
		clickScrub (e) {
			this.blockScrub = true
			scrubMove(e)
			this.el.body.addEventListener('mousemove', scrubMove)
		},
		clickVol (e) {
			this.blockVol = true
			volMove(e)
			this.el.body.addEventListener('mousemove', volMove)
		},
		hidevid () {
			this.hideVid = !this.hideVid
			redraw()
		},
		hideplaylist () {
			this.hideQueue = !this.hideQueue
			redraw()
		},
		playpause: playpause,
		dragenter (e) {
			this.el.drag.style.display = 'flex'
			return false
		},
		dragleave (e) {
			this.el.drag.style.display = 'none'
			return false
		},
		drop (e) {
			this.el.drag.style.display = 'none'

			Array.from(e.dataTransfer.items).forEach(i => {
				const path = i.getAsFile().path
				const entry = i.webkitGetAsEntry()
				if (entry.isFile) {
					openFile(path)
				}
				else if (entry.isDirectory) {
					// do nothing
				}
			})
		
			return false
		},
	},
})

// functions

function onYouTubeIframeAPIReady() {
	ytPlayer = new YT.Player('ytPlayer', {
		videoId: 'XIMLoLxmTDw', // 10 hr black screen
		playerVars: {
			fs: 0,
			rel: 0,
			modestbranding: 1,
			iv_load_policy: 3,
			controls: 0,
			showinfo: 0,
		},
		events: {
			'onReady': () => {
				if (!data.refreshed) {
					document.getElementById('ytPlayer').contentWindow.location.reload()
					data.refreshed = true;
				}
				else {
					runOnce()
				}
			}
		},
	})
}

function runOnce() {
	
	data.el.ytPlayer = document.getElementById('ytPlayer')
	data.el.scrub = document.getElementById('scrub')
	data.el.scrubContainer = document.getElementById('scrubContainer')
	data.el.volumeContainer = document.getElementById('volumeContainer')
	data.el.pp = document.getElementById('playpause')
	data.el.volume = document.getElementById('volume')
	data.el.drag = document.getElementById('drag')
	data.el.mainContent = document.getElementById('mainContent')
	data.el.queueContainer = document.getElementById('queueContainer')
	data.el.queueButtons = document.getElementById('queueButtons')
	data.el.ytCover = document.getElementById('ytCover')

	ytPlayer.setVolume(50);
	data.el.ytCover.style.opacity = '0'

	requestAnimationFrame(songStateChecker)
}

// "game" loop
function songStateChecker() {
	try {
		// unstarted: -1, ended: 0, playing: 1, paused: 2, buffering: 3, cued: 5
		const state = ytPlayer.getPlayerState()
		if (state === -1 || state === 0 || state === 5) {
			nextVid()
		}

		// meta data
		const currentTime = ytPlayer.getCurrentTime()
		const duration = ytPlayer.getDuration()
		data.currentTime = secondsToMinutes(currentTime)
		data.duration = secondsToMinutes(duration)

		// video scrub bar
		if (!data.blockScrub) {
			const scrubWidth = (currentTime / duration) * data.el.scrubContainer.clientWidth
			data.el.scrub.style.width = scrubWidth + 'px'
		}

		// volume bar
		if (!data.blockVol) {
			const volWidth = ytPlayer.getVolume() * 0.01 * data.el.volumeContainer.clientWidth
			data.el.volume.style.width = volWidth + 'px'
		}

		// play/pause button
		if (state === 2 && data.el.pp.title !== 'Play video') { // currently paused, set ui to "play"
			data.el.pp.title = 'Play video'
			const $icon = data.el.pp.children[0]
			$icon.classList.remove('fa-pause')
			$icon.classList.add('fa-play')
		}
		else if (state === 1 && data.el.pp.title !== 'Pause video') { // currently playing, ui to "pause"
			data.el.pp.title = 'Pause video'
			const $icon = data.el.pp.children[0]
			$icon.classList.remove('fa-play')
			$icon.classList.add('fa-pause')
		}

		// ghetto adblocking
		if (data.el.video_ad === undefined) {
			data.el.video_ad = data.el.ytPlayer.contentWindow.document.getElementsByClassName('video-ads')[0]
		}
		else {
			data.el.video_ad.style.display = 'none'
		}

	} catch (e) {}
	requestAnimationFrame(songStateChecker)
}

function secondsToMinutes(totalSeconds) {
	const minutes = (totalSeconds / 60)|0
	const seconds = (totalSeconds % 60)|0
	let leadingMinutesZero = ''
	if (minutes < 10) leadingMinutesZero = '0'
	let leadingSecondsZero = ''
	if (seconds < 10) leadingSecondsZero = '0'
	return `${leadingMinutesZero}${minutes}:${leadingSecondsZero}${seconds}`
}

function getYoutubeTitle(id, fn) {
	let url = `https://www.youtube.com/embed/${id}`
	fetch(url).then(res => res.text()).then(res => {
		let title = res.split('<title>')[1].split('</title>')[0]
		if (title.includes(' - YouTube')) {
			fn(title.split(' - YouTube')[0])
		}
		else fn(false)
	})
}

function sanitizeYT(url) {
	// youtube.com/attribution_link?a=JZ6nOJ4SvBc&u=/watch%3Fv%3D[id]%26feature%3Dem-share_video_user
	if (url.includes('u=')) {
		const queries = url.split('?')[1].split('&')
		for (let i = 0; i < queries.length; i++) {
			const query = queries[i].split('=')
			if (query[0] == 'u') return decodeURIComponent(query[1]).split('v=')[1].substring(0,11)
		}
	}
	// youtube.com/watch?v=[id]&t=1m1s, attribution_link continued
	else if (url.includes('v=')) return url.split('v=')[1].substring(0,11)
	// youtu.be/[id]?t=1m1s, youtube.com/v/[id], youtube.com/embed/[id]?autoplay=1
	else {
		const splitURL = url.split('/')
		const output = splitURL[splitURL.length-1].split('?')[0]
		if (output.length == 11) return output
		return false
	}
}

function nextVid() {
	clearSelected()
	data.currentVid = ''
	if (data.vidQueue && data.vidQueue.length > 0) {
		let tempVid = data.vidQueue.shift()
		ytPlayer.loadVideoById(tempVid.id, 0, 'medium')
		ytPlayer.playVideo()
		data.currentVid = tempVid
		data.vidQueue.push(tempVid)
		saveQueue()
	}
}

function prevVid() {
	clearSelected();
	let time = ytPlayer.getCurrentTime()
	if (time < 3) {
		data.currentVid = ''
		if (data.vidQueue && data.vidQueue.length > 0) {
			let tempVid = data.vidQueue.pop()
			data.vidQueue.unshift(tempVid)
			tempVid = data.vidQueue[data.vidQueue.length-1]
			ytPlayer.loadVideoById(tempVid.id, 0, 'medium')
			ytPlayer.playVideo()
			data.currentVid = tempVid
			saveQueue()
		}
	}
	else ytPlayer.seekTo(0, true)
}

function addVid(videoid) {
	// allows most copy-pastes to work
	if ( videoid.length != 11 ) {
		videoid = sanitizeYT(videoid)
		if (!videoid) return '' // not a good url
	}

	// check if it's already in there
	let found = false
	for (let i = 0; i < data.vidQueue.length; i++) {
		if (data.vidQueue[i].id === videoid) {
			found = true
			break
		}
	}
	if (found) {
		// TODO some message
		return ''
	}

	getYoutubeTitle(videoid, function (title) {
		if (!title) return '' // no video found
		let pushObj = {
			id: videoid,
			title: title,
		}
		data.vidQueue.push(pushObj)

		saveQueue()

		// If after adding a song, the player isn't playing, start it
		let state = ytPlayer.getPlayerState()
		if (state !== 1 && state !== 2) nextVid()
	})
}

function toggleMute() {
	if (ytPlayer.isMuted()) ytPlayer.unMute()
	else ytPlayer.mute()
}

function playpause() {
	// currently playing, set state to "pause"
	if (ytPlayer.getPlayerState() === 1) ytPlayer.pauseVideo()
	// currently paused, set state to "play"
	else ytPlayer.playVideo()
}

// Fisher-Yates shuffle
function shuffle(inputArray) {
	const array = JSON.parse(JSON.stringify(inputArray))
	const len = array.length
	for (let i = 0; i < len-2; i++) {
		const select = i + (Math.random() * (len - i))|0
		const swap = array[i]
		array[i] = array[select]
		array[select] = swap
	}
	return array
}

function clearSelected() {
	if (typeof data.selected === 'number') {
		let el = document.getElementById('vq'+data.selected);
		el.style.background = '';
		data.selected = null;
	}
}

function deleteSelected() {
	if (typeof data.selected === 'number') {
		const tempQueue = JSON.parse(JSON.stringify(data.vidQueue))
		tempQueue.splice(data.selected, 1)
		data.vidQueue = tempQueue
		saveQueue()
		clearSelected()
	}
}

function upSelected() {
	if (typeof data.selected === 'number' && data.selected > 0) {
		const newIndex = data.selected - 1
		const tempQueue = JSON.parse(JSON.stringify(data.vidQueue))
		const swapItem = tempQueue[newIndex]
		tempQueue[newIndex] = tempQueue[newIndex + 1]
		tempQueue[newIndex + 1] = swapItem
		
		data.vidQueue = tempQueue
		
		data.selected = newIndex
	}
}

function downSelected() {
	if (typeof data.selected === 'number' && data.selected < data.vidQueue.length - 1) {
		const newIndex = data.selected + 1
		const tempQueue = JSON.parse(JSON.stringify(data.vidQueue))
		const swapItem = tempQueue[newIndex]
		tempQueue[newIndex] = tempQueue[newIndex - 1]
		tempQueue[newIndex - 1] = swapItem
		
		data.vidQueue = tempQueue
		
		data.selected = newIndex
	}
}

function select(ind) {
	clearSelected()

	const el = document.getElementById(`vq${ind}`)
	el.style.background = 'rgba(30,120,255,1)'

	data.selected = ind
}

function volMove(e) {
	// let pixelsFromLeft = e.pageX - data.cache.volumeContainer.offsetLeft;
	let pixelsFromLeft = e.pageX - 12
	const containerWidth = data.el.volumeContainer.clientWidth
	if (pixelsFromLeft > containerWidth) pixelsFromLeft = containerWidth
	else if (pixelsFromLeft < 0) pixelsFromLeft = 0
	const vol = Math.round( (pixelsFromLeft/containerWidth*100) )
	ytPlayer.setVolume(vol)
	requestAnimationFrame(() => {
		data.el.volume.style.width = `${pixelsFromLeft}px`
	})
}

function scrubMove(e) {
	let pixelsFromLeft = e.pageX - data.el.scrubContainer.offsetLeft
	const containerWidth = data.el.scrubContainer.clientWidth
	if (pixelsFromLeft > containerWidth) pixelsFromLeft = containerWidth
	else if (pixelsFromLeft < 0) pixelsFromLeft = 0
	requestAnimationFrame(() => {
		data.el.scrub.style.width = `${pixelsFromLeft}px`
	})
}

function saveQueue() {
	localStorage.setItem('vidQueue', JSON.stringify(data.vidQueue))
}

function openFile(path) {
	const rnPlaylist = fs.readFileSync(path).toString()
	const arrayPlaylist = rnPlaylist.replace(/\r\n/g, '\n').split('\n')
	arrayPlaylist.forEach(x => addVid(x))
}

function redraw() {
	const win = nw.Window.get()
	const min_width = nw.App.manifest.window.min_width
	const min_height = nw.App.manifest.window.min_height

	if (!data.hideVid && !data.hideQueue) { // default
		data.el.ytPlayer.style.height = 'calc(100vh - 481px)'
		data.el.ytCover.style.height = 'calc(100vh - 481px)'
		data.el.queueContainer.style.height = '306px'
		data.el.scrubContainer.style.marginTop = '10px'
		data.el.ytPlayer.style.display = ''
		win.setMinimumSize(min_width, min_height)
		win.setMaximumSize(2147483647, 2147483647)
		// win.resizeBy(0, 0)
	}
	else if (data.hideVid && !data.hideQueue) {
		data.el.ytPlayer.style.height = 'calc(100vh - 481px)'
		data.el.ytCover.style.height = 'calc(100vh - 481px)'
		data.el.queueContainer.style.height = 'calc(100vh - 161px)'
		data.el.scrubContainer.style.marginTop = '0px'
		data.el.ytPlayer.style.display = 'none'
		win.setMinimumSize(min_width, min_height - 270)
		win.setMaximumSize(2147483647, 2147483647)
		win.resizeBy(0, -270)
	}
	else if (!data.hideVid && data.hideQueue) {
		data.el.ytPlayer.style.height = 'calc(100vh - 125px)'
		data.el.ytCover.style.height = 'calc(100vh - 125px)'
		data.el.queueContainer.style.height = '306px'
		data.el.scrubContainer.style.marginTop = '10px'
		data.el.ytPlayer.style.display = ''
		win.setMinimumSize(min_width, min_height - 356)
		win.setMaximumSize(2147483647, 2147483647)
		win.resizeBy(0, -356)
	}
	else { // hide both
		data.el.ytPlayer.style.height = '0px'
		data.el.ytCover.style.height = '0px'
		data.el.queueContainer.style.height = '0px'
		data.el.scrubContainer.style.marginTop = '0px'
		data.el.ytPlayer.style.display = 'none'
		win.setMinimumSize(min_width, min_height - 356 - 270 - 15)
		win.setMaximumSize(2147483647, min_height - 356 - 270 - 15)
	}
}

// Listeners

document.getElementById('saveFile').addEventListener('change', evt => {
	if (evt.target.value !== '') {
		const saveString = data.vidQueue.reduce((acc, el) => acc + el.id + '\r\n', '');
		fs.writeFile(evt.target.value, saveString, err => {
			if (err) console.error(err)
		})
	}
}, false)

document.getElementById('openFile').addEventListener('change', evt => {
	if (evt.target.value !== '') {
		data.vidQueue = []
		openFile(evt.target.value)
	}
}, false)

data.el.body.addEventListener('mouseup', e => {
	if (data.blockVol) {
		data.el.body.removeEventListener('mousemove', volMove);
		// let pixelsFromLeft = e.pageX - data.cache.volumeContainer.offsetLeft;
		let pixelsFromLeft = e.pageX - 12
		const containerWidth = data.el.volumeContainer.clientWidth
		if (pixelsFromLeft > containerWidth) pixelsFromLeft = containerWidth
		else if (pixelsFromLeft < 0) pixelsFromLeft = 0
		const vol = Math.round( (pixelsFromLeft/containerWidth*100) )
		ytPlayer.setVolume(vol)
		requestAnimationFrame(() => data.blockVol = false)
	} else if (data.blockScrub) {
		data.el.body.removeEventListener('mousemove', scrubMove)
		let pixelsFromLeft = e.pageX - data.el.scrubContainer.offsetLeft
		const containerWidth = data.el.scrubContainer.clientWidth
		if (pixelsFromLeft > containerWidth) pixelsFromLeft = containerWidth
		else if (pixelsFromLeft < 0) pixelsFromLeft = 0
		const scrubTimePercent = Math.round( (pixelsFromLeft/containerWidth*100) ) * 0.01
		const scrubTime = (scrubTimePercent * ytPlayer.getDuration())|0
		ytPlayer.seekTo(scrubTime, true)
		requestAnimationFrame(() => data.blockScrub = false)
	}
})

window.onkeydown = e => {
	if (e.code === 'Space') {
		e.preventDefault() // prevents a previously pressed button from activating
		playpause()
	}
	else if (e.code === 'Escape') {
		e.preventDefault()
		clearSelected()
		data.vidInput = ''
	}
	else if (e.code === 'ArrowRight' && e.ctrlKey) {
		e.preventDefault()
		nextVid()
	}
	else if (e.code === 'ArrowLeft' && e.ctrlKey) {
		e.preventDefault()
		prevVid()
	}
	else if (e.code === 'ArrowUp' && e.ctrlKey) {
		e.preventDefault()
		let currVol = ytPlayer.getVolume()
		ytPlayer.setVolume(currVol + 10)
	}
	else if (e.code === 'ArrowDown' && e.ctrlKey) {
		e.preventDefault()
		let currVol = ytPlayer.getVolume()
		ytPlayer.setVolume(currVol - 10)
	}
	else if (e.code === 'KeyS' && e.ctrlKey) {
		e.preventDefault()
		document.getElementById('saveFile').click()
	}
	else if (e.code === 'KeyO' && e.ctrlKey) {
		e.preventDefault()
		document.getElementById('openFile').click()
	}
	else if (e.code === 'Delete') {
		e.preventDefault()
		deleteSelected()
	}
	else if (e.code === 'ArrowUp' && e.shiftKey) {
		e.preventDefault()
		upSelected()
	}
	else if (e.code === 'ArrowDown' && e.shiftKey) {
		e.preventDefault()
		downSelected()
	}
	else if (e.code === 'ArrowUp' && !e.shiftKey && !e.ctrlKey) {
		e.preventDefault()
		if (typeof data.selected === 'number' && data.selected > 0) {
			select(data.selected - 1)
			updateScroll()
		} 
		else if (typeof data.vidQueue.length === 'number' && data.vidQueue.length > 0) {
			select(0)
			updateScroll()
		}
	}
	else if (e.code === 'ArrowDown' && !e.shiftKey && !e.ctrlKey) {
		e.preventDefault()
		if (typeof data.selected === 'number' && data.selected < data.vidQueue.length - 1) {
			select(data.selected + 1)
			updateScroll()
		}
		else if (typeof data.vidQueue.length === 'number' && data.vidQueue.length > 0) {
			select(data.vidQueue.length - 1)
			updateScroll()
		}
	}

	function updateScroll() {
		document.getElementById('vq'+data.selected).scrollIntoView({behavior: 'instant', block: 'nearest'})
	}
}

window.ondragover = e => {
	e.preventDefault()
	return false
}
window.ondragleave = e => {
	e.preventDefault()
	return false
}
window.ondrop = e => {
	e.preventDefault()
	return false
}