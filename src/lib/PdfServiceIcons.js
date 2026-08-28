/**
 * Draws a small vector icon next to a service name in a jsPDF document.
 * Uses keyword matching on the service name to pick the appropriate icon.
 * Icons are drawn in a 3×3 mm box starting at (x, y).
 *
 * @param {jsPDF} doc - jsPDF document instance
 * @param {number} x - left edge of the icon box (mm)
 * @param {number} y - top edge of the icon box (mm)
 * @param {string} serviceName - service name for keyword matching
 * @param {string} category - service category (fallback for matching)
 * @param {number[]} color - RGB array, e.g. [122, 155, 114]
 */
export function drawServiceIcon(doc, x, y, serviceName, category, color) {
  const c = color || [122, 155, 114];
  const name = (serviceName || '').toLowerCase();
  const cat = (category || '').toLowerCase();

  doc.setFillColor(c[0], c[1], c[2]);
  doc.setDrawColor(c[0], c[1], c[2]);
  doc.setLineWidth(0.3);

  const ix = x;
  const iy = y;
  const white = () => { doc.setFillColor(255, 255, 255); doc.setDrawColor(255, 255, 255); };
  const restore = () => { doc.setFillColor(c[0], c[1], c[2]); doc.setDrawColor(c[0], c[1], c[2]); };

  // --- Keyword → icon type ---
  let type = 'default';
  if (/silla|sillas|mesa|mesas|mobiliario|sillon|sillón|banqueta|carpa|carpas/.test(name)) type = 'chair';
  else if (/seguridad|seguro|polic|vigilador|guardia/.test(name)) type = 'shield';
  else if (/torta|tortas|cumpleaños|cumpleanos|pastel|desayuno|merienda/.test(name)) type = 'cake';
  else if (/decor|flor|flores|adorno|centro de mesa|globo|globos|ambientacion|ambientación|cariñoso|cariños|cariño/.test(name)) type = 'flower';
  else if (/bebida|bebidas|bar|tragos|vino|vinos|champagne|champaña|whisky|cerveza|open bar|jugos|refrescos|agua/.test(name)) type = 'glass';
  else if (/limpieza|limpiador|sereno/.test(name)) type = 'broom';
  else if (/tramite|trámite|habilitacion|habilitación|permiso|document|papel|gestion|gestión|municipal/.test(name)) type = 'document';
  else if (/musica|música|sonido|dj|banda|orquesta|audio|altavoz|speaker|pantalla|pantallas|proyector/.test(name)) type = 'music';
  else if (/catering|comida|menu|menú|cena|almuerzo|picada|parrilla|asado|caterin|sandwich|sándwich|pizza|empanada|tabla|cordero|lechón|lechon|cassero|caserola/.test(name)) type = 'plate';
  else if (/foto|fotograf|video|cámara|camara|filmacion|filmación|registro/.test(name)) type = 'camera';
  else if (/estacionamiento|coche|auto|vehiculo|vehículo|parking|garage/.test(name)) type = 'car';
  else if (/alquiler|espacio|salon|salón|quincho|quinta|lugar|locacion|locación|predio/.test(name)) type = 'house';
  else if (/mozo|mozos|camarera|camarero|personal|staff|anfitrion|anfitrión|recepcionista|maestro|ceremonia/.test(name)) type = 'person';
  else if (/baño|baños|banio|banios|toilet|higienico|higiénico|servicio/.test(name)) type = 'bath';
  else if (/animacion|animación|animador|show|espectaculo|espectáculo|mago|payaso|artist|caramelos|juegos|infantil/.test(name)) type = 'star';
  else if (/clima|calefaccion|calefacción|estufa|aire|ventilador|patio|patío|gazebo|pergola|pérgola/.test(name)) type = 'heat';
  else if (/luz|iluminacion|iluminación|led|luces|foco|velas|candelabro/.test(name)) type = 'bulb';
  else if (/transporte|combis|combi|micro|colectivo|traslado|traslados|remis/.test(name)) type = 'bus';
  else if (/pastor|parrillero|chef|cocina|cocinero|hornalla|hornallas/.test(name)) type = 'plate';

  // --- Draw the icon ---
  switch (type) {
    case 'chair':
      doc.line(ix, iy + 0.3, ix, iy + 2);
      doc.line(ix, iy + 2, ix + 2.2, iy + 2);
      doc.line(ix, iy + 2, ix, iy + 3);
      doc.line(ix + 2.2, iy + 2, ix + 2.2, iy + 3);
      break;
    case 'shield':
      doc.roundedRect(ix + 0.3, iy + 0.3, 2.4, 1.8, 0.5, 0.5, 'F');
      doc.triangle(ix + 0.3, iy + 1.8, ix + 2.7, iy + 1.8, ix + 1.5, iy + 3, 'F');
      white();
      doc.setLineWidth(0.4);
      doc.line(ix + 1.5, iy + 1, ix + 1.5, iy + 2.2);
      doc.line(ix + 1, iy + 1.6, ix + 2, iy + 1.6);
      restore();
      doc.setLineWidth(0.3);
      break;
    case 'cake':
      doc.roundedRect(ix + 0.3, iy + 1.5, 2.4, 1.5, 0.3, 0.3, 'F');
      doc.setLineWidth(0.4);
      doc.line(ix + 1.5, iy + 1.5, ix + 1.5, iy + 0.6);
      doc.circle(ix + 1.5, iy + 0.4, 0.3, 'F');
      doc.setLineWidth(0.3);
      break;
    case 'flower':
      doc.circle(ix + 1.5, iy + 1.5, 0.55, 'F');
      doc.circle(ix + 1.5, iy + 0.6, 0.42, 'F');
      doc.circle(ix + 1.5, iy + 2.4, 0.42, 'F');
      doc.circle(ix + 0.6, iy + 1.5, 0.42, 'F');
      doc.circle(ix + 2.4, iy + 1.5, 0.42, 'F');
      break;
    case 'glass':
      doc.triangle(ix + 0.3, iy + 0.3, ix + 2.7, iy + 0.3, ix + 1.5, iy + 1.8, 'F');
      doc.setLineWidth(0.4);
      doc.line(ix + 1.5, iy + 1.8, ix + 1.5, iy + 2.7);
      doc.line(ix + 0.7, iy + 2.7, ix + 2.3, iy + 2.7);
      doc.setLineWidth(0.3);
      break;
    case 'broom':
      doc.setLineWidth(0.5);
      doc.line(ix + 0.3, iy + 0.3, ix + 2, iy + 2);
      doc.line(ix + 2, iy + 2, ix + 2.8, iy + 1.4);
      doc.line(ix + 2.2, iy + 2.3, ix + 3, iy + 1.7);
      doc.line(ix + 2.4, iy + 2.6, ix + 3.2, iy + 2);
      doc.setLineWidth(0.3);
      break;
    case 'document':
      doc.roundedRect(ix + 0.5, iy + 0.3, 2, 2.7, 0.2, 0.2, 'F');
      white();
      doc.setLineWidth(0.3);
      doc.line(ix + 0.9, iy + 1, ix + 2.1, iy + 1);
      doc.line(ix + 0.9, iy + 1.5, ix + 2.1, iy + 1.5);
      doc.line(ix + 0.9, iy + 2, ix + 1.8, iy + 2);
      restore();
      doc.setLineWidth(0.3);
      break;
    case 'music':
      doc.circle(ix + 0.5, iy + 2.3, 0.5, 'F');
      doc.circle(ix + 2, iy + 2.3, 0.5, 'F');
      doc.setLineWidth(0.4);
      doc.line(ix + 1, iy + 2.3, ix + 1, iy + 0.5);
      doc.line(ix + 2.5, iy + 2.3, ix + 2.5, iy + 0.5);
      doc.line(ix + 1, iy + 0.5, ix + 2.5, iy + 0.5);
      doc.setLineWidth(0.3);
      break;
    case 'plate':
      doc.circle(ix + 1.5, iy + 1.5, 1.3, 'F');
      white();
      doc.setLineWidth(0.4);
      doc.circle(ix + 1.5, iy + 1.5, 0.8, 'S');
      restore();
      doc.setLineWidth(0.3);
      break;
    case 'camera':
      doc.roundedRect(ix + 0.3, iy + 0.8, 2.4, 1.8, 0.2, 0.2, 'F');
      doc.roundedRect(ix + 1.8, iy + 0.5, 0.6, 0.4, 0.1, 0.1, 'F');
      white();
      doc.setLineWidth(0.4);
      doc.circle(ix + 1.5, iy + 1.7, 0.5, 'S');
      restore();
      doc.setLineWidth(0.3);
      break;
    case 'car':
      doc.roundedRect(ix + 0.3, iy + 1.2, 2.4, 1.2, 0.3, 0.3, 'F');
      doc.roundedRect(ix + 0.8, iy + 0.5, 1.4, 0.8, 0.2, 0.2, 'F');
      white();
      doc.setLineWidth(0.4);
      doc.circle(ix + 0.8, iy + 2.5, 0.4, 'S');
      doc.circle(ix + 2.2, iy + 2.5, 0.4, 'S');
      restore();
      doc.setLineWidth(0.3);
      break;
    case 'house':
      doc.triangle(ix + 0.3, iy + 1.5, ix + 2.7, iy + 1.5, ix + 1.5, iy + 0.2, 'F');
      doc.rect(ix + 0.7, iy + 1.5, 1.6, 1.8, 'F');
      white();
      doc.setLineWidth(0.4);
      doc.rect(ix + 1.3, iy + 2.3, 0.4, 1, 'S');
      restore();
      doc.setLineWidth(0.3);
      break;
    case 'person':
      doc.circle(ix + 1.5, iy + 0.7, 0.6, 'F');
      doc.triangle(ix + 0.3, iy + 3.2, ix + 2.7, iy + 3.2, ix + 1.5, iy + 1.5, 'F');
      break;
    case 'bath':
      doc.circle(ix + 1.5, iy + 1.8, 1, 'F');
      doc.triangle(ix + 0.7, iy + 1.5, ix + 2.3, iy + 1.5, ix + 1.5, iy + 0.2, 'F');
      break;
    case 'star':
      doc.triangle(ix + 1.5, iy + 0.2, ix + 0.5, iy + 1.5, ix + 2.5, iy + 1.5, 'F');
      doc.triangle(ix + 1.5, iy + 2.8, ix + 0.5, iy + 1.5, ix + 2.5, iy + 1.5, 'F');
      break;
    case 'heat':
      doc.circle(ix + 1.5, iy + 1.5, 0.8, 'F');
      doc.setLineWidth(0.4);
      doc.line(ix + 1.5, iy + 0.2, ix + 1.5, iy + 0.5);
      doc.line(ix + 1.5, iy + 2.5, ix + 1.5, iy + 2.8);
      doc.line(ix + 0.2, iy + 1.5, ix + 0.5, iy + 1.5);
      doc.line(ix + 2.5, iy + 1.5, ix + 2.8, iy + 1.5);
      doc.line(ix + 0.5, iy + 0.5, ix + 0.7, iy + 0.7);
      doc.line(ix + 2.3, iy + 0.5, ix + 2.5, iy + 0.7);
      doc.line(ix + 0.5, iy + 2.5, ix + 0.7, iy + 2.3);
      doc.line(ix + 2.3, iy + 2.5, ix + 2.5, iy + 2.3);
      doc.setLineWidth(0.3);
      break;
    case 'bulb':
      doc.circle(ix + 1.5, iy + 1.3, 0.9, 'F');
      doc.rect(ix + 1.1, iy + 2, 0.8, 0.8, 'F');
      break;
    case 'bus':
      doc.roundedRect(ix + 0.3, iy + 0.5, 2.4, 2, 0.3, 0.3, 'F');
      white();
      doc.setLineWidth(0.3);
      doc.line(ix + 0.5, iy + 1.4, ix + 2.5, iy + 1.4);
      doc.circle(ix + 0.9, iy + 2.7, 0.3, 'S');
      doc.circle(ix + 2.1, iy + 2.7, 0.3, 'S');
      restore();
      doc.setLineWidth(0.3);
      break;
    default:
      doc.circle(ix + 1.5, iy + 1.5, 1.1, 'F');
  }
}
