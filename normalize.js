module.exports = (datePart) => {
	day_aliases = {
		'lun': 'Lundi',
		'mar': 'Mardi',
		'mer': 'Mercredi',
		'jeu': 'Jeudi',
		'ven': 'Vendredi',
		'sam': 'Samedi',
		'dim': 'Dimanche'
	};

	let cleaned = datePart.endsWith('.') ? datePart.slice(0, -1) : datePart;
	cleaned = day_aliases[cleaned] || datePart
	return cleaned.charAt(0)
		.toUpperCase() + cleaned.slice(1)
};