const getCenter = coordArray => {
    let latMin = Infinity;
    let latMax = -Infinity;
    let lngMin = Infinity;
    let lngMax = -Infinity;

    coordArray.forEach(({ lat, lng }) => {
        if (lat < latMin) latMin = lat;
        else if (lat > latMax) latMax = lat;
        if (lng < lngMin) lngMin = lng;
        else if (lng > lngMax) lngMax = lng;
    });

    const latCenter = latMin + ((latMax - latMin) / 2);
    const lngCenter = lngMin + ((lngMax - lngMin) / 2);
    const center = { lat: latCenter, lng: lngCenter };

    return center;
};

// gets the angle between the two points where center is 0,0 on a Cartesean plane
const getAngle = (center, coord) => {
    const dy = coord.lat - center.lat;
    const dx = coord.lng - center.lng;
    let radians = Math.atan2(dy, dx);

    // handle negative radian value returned when dy is negative
    if (dy < 0) radians = (2 * Math.PI) + radians;
    const theta = radians * 180 / Math.PI;

    return theta;
};

const sortCoords = coordArray => {
    const center = getCenter(coordArray);

    const arrayWithAngles = coordArray.map(coord => ({
        ...coord,
        angle: getAngle(center, coord),
    }));

    const sortedArray = arrayWithAngles
        .sort((a, b) => {
            if (a.angle < b.angle) return -1;
            if (a.angle > b.angle) return 1;
            return 0;
        });

    return sortedArray;
};

export default { sortCoords, getCenter };