const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']); // Force public DNS for Atlas SRV lookup

const mongoose = require('mongoose');

// Connect to your MongoDB Atlas Cluster
const MONGO_URI = 'mongodb+srv://eduardllegado09_db_user:071405kenji@cluster0.iyvnxwh.mongodb.net/?appName=Cluster0';

const userSchema = new mongoose.Schema({
    studentNo: String,
    email: String,
    password: String,
    role: String,
    adminName: { type: String, default: "System Administrator" },
    username: { type: String, default: "admin" },
    profilePhoto: { type: String, default: "" }
});
const User = mongoose.model('User', userSchema);

const alertSchema = new mongoose.Schema({
    studentName: String,
    studentNo: String,
    email: String,
    course: String,
    section: String,
    city: String,
    province: String,
    notes: String,
    gwa: Number,
    attendance: Number,
    riskLevel: String,
    confidenceScore: Number,
    interventionStatus: { type: String, default: "Pending Action" },
    timestamp: { type: Date, default: Date.now }
}, { strict: false });
const Alert = mongoose.model('Alert', alertSchema);

// Cleaned 160 synthetic students
const students = [
  {"studentNo": "23-20-256", "studentName": "KYLA P. ALCANTARA", "email": "kyla.alcantara_256@udm.edu.ph", "program": "BSED - Social Studies"},
  {"studentNo": "23-20-183", "studentName": "PAOLO MARCO L. ALCANTARA", "email": "paolo.alcantara_183@udm.edu.ph", "program": "BSED - General Science"},
  {"studentNo": "23-20-278", "studentName": "VALERIE V. BARCELONA", "email": "valerie.barcelona_278@udm.edu.ph", "program": "BSED - Mathematics"},
  {"studentNo": "23-20-193", "studentName": "DALE NATHAN B. BAUTISTA", "email": "dale.bautista_193@udm.edu.ph", "program": "BSED - Mathematics"},
  {"studentNo": "23-20-185", "studentName": "DANICA H. BAUTISTA", "email": "danica.bautista_185@udm.edu.ph", "program": "BSED - General Science"},
  {"studentNo": "23-20-179", "studentName": "JANINE G. BAUTISTA", "email": "janine.bautista_179@udm.edu.ph", "program": "BSED - Mathematics"},
  {"studentNo": "23-20-079", "studentName": "ALTHEA KATHLEEN L. BELMONTE", "email": "althea.belmonte_079@udm.edu.ph", "program": "BSED - Social Studies"},
  {"studentNo": "23-20-216", "studentName": "NATHANIEL JOHN E. BELTRAN", "email": "nathaniel.beltran_216@udm.edu.ph", "program": "BSED - General Science"},
  {"studentNo": "23-20-137", "studentName": "PATRICIA MAE C. BERNAL", "email": "patricia.bernal_137@udm.edu.ph", "program": "BSED - Physical Education"},
  {"studentNo": "23-20-177", "studentName": "PATRICIA NICOLE R. BUENAVENTURA", "email": "patricia.buenaventura_177@udm.edu.ph", "program": "BSED - English"},
  {"studentNo": "23-20-108", "studentName": "DOMINIQUE F. CABRERA", "email": "dominique.cabrera_108@udm.edu.ph", "program": "BSED - Physical Education"},
  {"studentNo": "23-20-189", "studentName": "GABRIEL L. CABRERA", "email": "gabriel.cabrera_189@udm.edu.ph", "program": "BSED - English"},
  {"studentNo": "23-20-112", "studentName": "MARIA SOFIA S. CABRERA", "email": "maria.cabrera_112@udm.edu.ph", "program": "BSED - Mathematics"},
  {"studentNo": "23-20-128", "studentName": "TRISTAN JOSHUA D. CALDERON", "email": "tristan.calderon_128@udm.edu.ph", "program": "BSED - Social Studies"},
  {"studentNo": "23-20-264", "studentName": "AARON PAUL E. CARIÑO", "email": "aaron.cario_264@udm.edu.ph", "program": "BSED - English"},
  {"studentNo": "23-20-164", "studentName": "LANCE GABRIEL R. CASAS", "email": "lance.casas_164@udm.edu.ph", "program": "BSED - Mathematics"},
  {"studentNo": "23-20-188", "studentName": "ANDREI MIGUEL C. CASTILLO", "email": "andrei.castillo_188@udm.edu.ph", "program": "BSED - English"},
  {"studentNo": "23-20-136", "studentName": "JUSTINE CARL M. CASTILLO", "email": "justine.castillo_136@udm.edu.ph", "program": "BSED - Physical Education"},
  {"studentNo": "23-20-221", "studentName": "KATHERINE JOYCE D. CASTRO", "email": "katherine.castro_221@udm.edu.ph", "program": "BSED - General Science"},
  {"studentNo": "23-20-239", "studentName": "MARIA ISABELLA V. CASTRO", "email": "maria.castro_239@udm.edu.ph", "program": "BSED - Social Studies"},
  {"studentNo": "23-20-293", "studentName": "CHRISTIAN DAVE N. CATACUTAN", "email": "christian.catacutan_293@udm.edu.ph", "program": "BSED - Physical Education"},
  {"studentNo": "23-20-116", "studentName": "BIANCA MARIE P. CORTEZ", "email": "bianca.cortez_116@udm.edu.ph", "program": "BSED - Social Studies"},
  {"studentNo": "23-20-155", "studentName": "ALEXANDRA JANE P. CRUZ", "email": "alexandra.cruz_155@udm.edu.ph", "program": "BSED - Physical Education"},
  {"studentNo": "23-20-238", "studentName": "BEATRICE NICOLE S. CRUZ", "email": "beatrice.cruz_238@udm.edu.ph", "program": "BSED - English"},
  {"studentNo": "23-20-143", "studentName": "FRANCIS MIGUEL C. CRUZ", "email": "francis.cruz_143@udm.edu.ph", "program": "BSED - Social Studies"},
  {"studentNo": "23-20-205", "studentName": "JOSHUA DAVE R. CRUZ", "email": "joshua.cruz_205@udm.edu.ph", "program": "BSED - General Science"},
  {"studentNo": "23-20-142", "studentName": "MARIA KATRINA B. CUSTODIO", "email": "maria.custodio_142@udm.edu.ph", "program": "BSED - Social Studies"},
  {"studentNo": "23-20-119", "studentName": "ARVIN JAY R. DE GUZMAN", "email": "arvin.deguzman_119@udm.edu.ph", "program": "BSED - Social Studies"},
  {"studentNo": "23-20-267", "studentName": "CARLO MIGUEL S. DE GUZMAN", "email": "carlo.deguzman_267@udm.edu.ph", "program": "BSED - Physical Education"},
  {"studentNo": "23-20-165", "studentName": "ELLA MAE M. DE GUZMAN", "email": "ella.deguzman_165@udm.edu.ph", "program": "BSED - General Science"},
  {"studentNo": "23-20-211", "studentName": "JEFFREY CARL L. DE JESUS", "email": "jeffrey.dejesus_211@udm.edu.ph", "program": "BSED - Social Studies"},
  {"studentNo": "23-20-132", "studentName": "KRISTINE JOYCE A. DE LEON", "email": "kristine.deleon_132@udm.edu.ph", "program": "BSED - Mathematics"},
  {"studentNo": "23-20-101", "studentName": "MICHAEL ANGELO C. DE LEON", "email": "michael.deleon_101@udm.edu.ph", "program": "BSED - Physical Education"},
  {"studentNo": "23-20-249", "studentName": "ANGELICA MAE M. DEL ROSARIO", "email": "angelica.delrosario_249@udm.edu.ph", "program": "BSED - General Science"},
  {"studentNo": "23-20-168", "studentName": "DANIEL JOSEPH T. DELA CRUZ", "email": "daniel.delacruz_168@udm.edu.ph", "program": "BSED - Mathematics"},
  {"studentNo": "23-20-202", "studentName": "JASPER ALLEN R. DELA CRUZ", "email": "jasper.delacruz_202@udm.edu.ph", "program": "BSED - Physical Education"},
  {"studentNo": "23-20-067", "studentName": "SEAN GABRIEL D. EVANGELISTA", "email": "sean.evangelista_067@udm.edu.ph", "program": "BSED - English"},
  {"studentNo": "23-20-176", "studentName": "ALEXIS JADE R. FABIAN", "email": "alexis.fabian_176@udm.edu.ph", "program": "BSED - English"},
  {"studentNo": "23-20-149", "studentName": "TRISTAN DAVE M. FABIAN", "email": "tristan.fabian_149@udm.edu.ph", "program": "BSED - Social Studies"},
  {"studentNo": "23-20-097", "studentName": "JARED V. FAJARDO", "email": "jared.fajardo_097@udm.edu.ph", "program": "BSED - General Science"},
  {"studentNo": "23-20-281", "studentName": "MIGUEL ANTONIO S. FAJARDO", "email": "miguel.fajardo_281@udm.edu.ph", "program": "BSED - Mathematics"},
  {"studentNo": "23-20-246", "studentName": "ARIANNE NICOLE S. FERNANDEZ", "email": "arianne.fernandez_246@udm.edu.ph", "program": "BSED - Social Studies"},
  {"studentNo": "23-20-109", "studentName": "CHRISTOPHER JOHN C. FERNANDEZ", "email": "christopher.fernandez_109@udm.edu.ph", "program": "BSED - English"},
  {"studentNo": "23-20-217", "studentName": "MARIA CIELO P. FERNANDO", "email": "maria.fernando_217@udm.edu.ph", "program": "BSED - General Science"},
  {"studentNo": "23-20-123", "studentName": "MARK JOSHUA T. FERRER", "email": "mark.ferrer_123@udm.edu.ph", "program": "BSED - Social Studies"},
  {"studentNo": "23-20-262", "studentName": "DANIELA MARIE A. FLORES", "email": "daniela.flores_262@udm.edu.ph", "program": "BSED - General Science"},
  {"studentNo": "23-20-083", "studentName": "NOEL T. FUENTES", "email": "noel.fuentes_083@udm.edu.ph", "program": "BSED - General Science"},
  {"studentNo": "23-20-252", "studentName": "KIMBERLY ANN S. GARCIA", "email": "kimberly.garcia_252@udm.edu.ph", "program": "BSED - General Science"},
  {"studentNo": "23-20-291", "studentName": "MARCUS GABRIEL B. GARCIA", "email": "marcus.garcia_291@udm.edu.ph", "program": "BSED - Mathematics"},
  {"studentNo": "23-20-151", "studentName": "PATRICK IAN D. GARCIA", "email": "patrick.garcia_151@udm.edu.ph", "program": "BSED - Mathematics"},
  {"studentNo": "23-20-160", "studentName": "ALEXA NICOLE C. GOMEZ", "email": "alexa.gomez_160@udm.edu.ph", "program": "BSED - English"},
  {"studentNo": "23-20-285", "studentName": "CARMELA JANE M. GOMEZ", "email": "carmela.gomez_285@udm.edu.ph", "program": "BSED - Physical Education"},
  {"studentNo": "23-20-272", "studentName": "PAULO JEROME P. GONZALES", "email": "paulo.gonzales_272@udm.edu.ph", "program": "BSED - Mathematics"},
  {"studentNo": "23-20-270", "studentName": "SOPHIA LORRAINE L. GONZALES", "email": "sophia.gonzales_270@udm.edu.ph", "program": "BSED - English"},
  {"studentNo": "23-20-244", "studentName": "ALYSSA MAE T. GUTIERREZ", "email": "alyssa.gutierrez_244@udm.edu.ph", "program": "BSED - General Science"},
  {"studentNo": "23-20-222", "studentName": "CHELSEA NICOLE R. HERNANDEZ", "email": "chelsea.hernandez_222@udm.edu.ph", "program": "BSED - English"},
  {"studentNo": "23-20-218", "studentName": "JAYSON CARL S. HERNANDEZ", "email": "jayson.hernandez_218@udm.edu.ph", "program": "BSED - Social Studies"},
  {"studentNo": "23-20-111", "studentName": "JOSHUA DAVE R. HERNANDEZ", "email": "joshua.hernandez_111@udm.edu.ph", "program": "BSED - General Science"},
  {"studentNo": "23-20-103", "studentName": "JONATHAN D. IBAY", "email": "jonathan.ibay_103@udm.edu.ph", "program": "BSED - Physical Education"},
  {"studentNo": "23-20-248", "studentName": "DARYL JOHN S. IGNACIO", "email": "daryl.ignacio_248@udm.edu.ph", "program": "BSED - Mathematics"},
  {"studentNo": "23-20-234", "studentName": "JUSTINE CARL B. ILAGAN", "email": "justine.ilagan_234@udm.edu.ph", "program": "BSED - English"},
  {"studentNo": "23-20-102", "studentName": "RAMON F. ILAGAN", "email": "ramon.ilagan_102@udm.edu.ph", "program": "BSED - General Science"},
  {"studentNo": "23-20-282", "studentName": "BIANCA MARIE L. JAVIER", "email": "bianca.javier_282@udm.edu.ph", "program": "BSED - Social Studies"},
  {"studentNo": "23-20-104", "studentName": "CHRISTIAN PAUL V. JAVIER", "email": "christian.javier_104@udm.edu.ph", "program": "BSED - Social Studies"},
  {"studentNo": "23-20-153", "studentName": "MARIA KATRINA B. JAVIER", "email": "maria.javier_153@udm.edu.ph", "program": "BSED - Physical Education"},
  {"studentNo": "23-20-295", "studentName": "PATRICIA MAE M. JAVIER", "email": "patricia.javier_295@udm.edu.ph", "program": "BSED - Mathematics"},
  {"studentNo": "23-20-214", "studentName": "BEATRICE ANNE C. JIMENEZ", "email": "beatrice.jimenez_214@udm.edu.ph", "program": "BSED - Mathematics"},
  {"studentNo": "23-20-115", "studentName": "CEDRIC JOHN M. JIMENEZ", "email": "cedric.jimenez_115@udm.edu.ph", "program": "BSED - Physical Education"},
  {"studentNo": "23-20-134", "studentName": "MIKAELLA JOY S. LAXAMANA", "email": "mikaella.laxamana_134@udm.edu.ph", "program": "BSED - General Science"},
  {"studentNo": "23-20-255", "studentName": "DANIEL MARCO T. LIM", "email": "daniel.lim_255@udm.edu.ph", "program": "BSED - Social Studies"},
  {"studentNo": "23-20-161", "studentName": "KATRINA BIANCA P. LIZARDO", "email": "katrina.lizardo_161@udm.edu.ph", "program": "BSED - English"},
  {"studentNo": "23-20-258", "studentName": "JOSHUA DAVE R. LUNA", "email": "joshua.luna_258@udm.edu.ph", "program": "BSED - Mathematics"},
  {"studentNo": "23-20-105", "studentName": "ALTHEA JOYCE P. MACARAIG", "email": "althea.macaraig_105@udm.edu.ph", "program": "BSED - English"},
  {"studentNo": "23-20-159", "studentName": "MARIA ISABELLA V. MACATANGAY", "email": "maria.macatangay_159@udm.edu.ph", "program": "BSED - Mathematics"},
  {"studentNo": "23-20-106", "studentName": "ARIANNE MAE M. MAGNO", "email": "arianne.magno_106@udm.edu.ph", "program": "BSED - Physical Education"},
  {"studentNo": "23-20-150", "studentName": "DOMINIQUE F. MALLARI", "email": "dominique.mallari_150@udm.edu.ph", "program": "BSED - General Science"},
  {"studentNo": "23-20-107", "studentName": "GABRIEL JOSHUA T. MALLARI", "email": "gabriel.mallari_107@udm.edu.ph", "program": "BSED - English"},
  {"studentNo": "23-20-178", "studentName": "JOHN GABRIEL R. MANALANG", "email": "john.manalang_178@udm.edu.ph", "program": "BSED - Social Studies"},
  {"studentNo": "23-20-209", "studentName": "MARK JOSHUA T. MANALO", "email": "mark.manalo_209@udm.edu.ph", "program": "BSED - English"},
  {"studentNo": "23-20-224", "studentName": "ANGELICA MAE M. MANUEL", "email": "angelica.manuel_224@udm.edu.ph", "program": "BSED - Physical Education"},
  {"studentNo": "23-20-297", "studentName": "JUSTINE CARL M. MANUEL", "email": "justine.manuel_297@udm.edu.ph", "program": "BSED - Mathematics"},
  {"studentNo": "23-20-220", "studentName": "PAOLO JEROME P. MARASIGAN", "email": "paolo.marasigan_220@udm.edu.ph", "program": "BSED - General Science"},
  {"studentNo": "23-20-259", "studentName": "CHRISTIAN DAVE N. MARIANO", "email": "christian.mariano_259@udm.edu.ph", "program": "BSED - English"},
  {"studentNo": "23-20-141", "studentName": "DANIEL JOSEPH T. MARQUEZ", "email": "daniel.marquez_141@udm.edu.ph", "program": "BSED - Mathematics"},
  {"studentNo": "23-20-148", "studentName": "KATHERINE JOYCE D. MARQUEZ", "email": "katherine.marquez_148@udm.edu.ph", "program": "BSED - Social Studies"},
  {"studentNo": "23-20-277", "studentName": "MARCUS GABRIEL B. MATIAS", "email": "marcus.matias_277@udm.edu.ph", "program": "BSED - Physical Education"},
  {"studentNo": "23-20-247", "studentName": "PATRICK IAN D. MATIAS", "email": "patrick.matias_247@udm.edu.ph", "program": "BSED - English"},
  {"studentNo": "23-20-203", "studentName": "BIANCA MARIE P. MENDOZA", "email": "bianca.mendoza_203@udm.edu.ph", "program": "BSED - English"},
  {"studentNo": "23-20-257", "studentName": "CARLO MIGUEL S. MENDOZA", "email": "carlo.mendoza_257@udm.edu.ph", "program": "BSED - Mathematics"},
  {"studentNo": "23-20-117", "studentName": "FRANCIS MIGUEL C. MENDOZA", "email": "francis.mendoza_117@udm.edu.ph", "program": "BSED - General Science"},
  {"studentNo": "23-20-110", "studentName": "MARIA KATRINA B. MENDOZA", "email": "maria.mendoza_110@udm.edu.ph", "program": "BSED - English"},
  {"studentNo": "23-20-213", "studentName": "ALEXA NICOLE C. MERCADO", "email": "alexa.mercado_213@udm.edu.ph", "program": "BSED - Social Studies"},
  {"studentNo": "23-20-144", "studentName": "CHELSEA NICOLE R. MERCADO", "email": "chelsea.mercado_144@udm.edu.ph", "program": "BSED - Physical Education"},
  {"studentNo": "23-20-276", "studentName": "DANIELA MARIE A. MIRANDA", "email": "daniela.miranda_276@udm.edu.ph", "program": "BSED - Mathematics"},
  {"studentNo": "23-20-184", "studentName": "JEFFREY CARL L. MIRANDA", "email": "jeffrey.miranda_184@udm.edu.ph", "program": "BSED - General Science"},
  {"studentNo": "23-20-280", "studentName": "SOPHIA LORRAINE L. MIRANDA", "email": "sophia.miranda_280@udm.edu.ph", "program": "BSED - Social Studies"},
  {"studentNo": "23-20-174", "studentName": "ANDREI MIGUEL C. MORALES", "email": "andrei.morales_174@udm.edu.ph", "program": "BSED - General Science"},
  {"studentNo": "23-20-170", "studentName": "JASPER ALLEN R. MORALES", "email": "jasper.morales_170@udm.edu.ph", "program": "BSED - Physical Education"},
  {"studentNo": "23-20-207", "studentName": "MIGUEL ANTONIO S. MORALES", "email": "miguel.morales_207@udm.edu.ph", "program": "BSED - English"},
  {"studentNo": "23-20-192", "studentName": "ALYSSA MAE T. NARCISO", "email": "alyssa.narciso_192@udm.edu.ph", "program": "BSED - Physical Education"},
  {"studentNo": "23-20-226", "studentName": "ARVIN JAY R. NATIVIDAD", "email": "arvin.natividad_226@udm.edu.ph", "program": "BSED - Mathematics"},
  {"studentNo": "23-20-135", "studentName": "SEAN GABRIEL D. NATIVIDAD", "email": "sean.natividad_135@udm.edu.ph", "program": "BSED - General Science"},
  {"studentNo": "23-20-120", "studentName": "ALEXIS JADE R. NAVARRO", "email": "alexis.navarro_120@udm.edu.ph", "program": "BSED - Social Studies"},
  {"studentNo": "23-20-230", "studentName": "DARYL JOHN S. NAVARRO", "email": "daryl.navarro_230@udm.edu.ph", "program": "BSED - English"},
  {"studentNo": "23-20-283", "studentName": "JAYSON CARL S. NAVARRO", "email": "jayson.navarro_283@udm.edu.ph", "program": "BSED - General Science"},
  {"studentNo": "23-20-201", "studentName": "CHRISTIAN PAUL V. OCAMPO", "email": "christian.ocampo_201@udm.edu.ph", "program": "BSED - English"},
  {"studentNo": "23-20-196", "studentName": "JOSHUA DAVE R. OCAMPO", "email": "joshua.ocampo_196@udm.edu.ph", "program": "BSED - Physical Education"},
  {"studentNo": "23-20-268", "studentName": "KRISTINE JOYCE A. OCAMPO", "email": "kristine.ocampo_268@udm.edu.ph", "program": "BSED - General Science"},
  {"studentNo": "23-20-169", "studentName": "ARIANNE NICOLE S. PADILLA", "email": "arianne.padilla_169@udm.edu.ph", "program": "BSED - Mathematics"},
  {"studentNo": "23-20-225", "studentName": "KIMBERLY ANN S. PANGILINAN", "email": "kimberly.pangilinan_225@udm.edu.ph", "program": "BSED - Social Studies"},
  {"studentNo": "23-20-113", "studentName": "MICHAEL ANGELO C. PANGILINAN", "email": "michael.pangilinan_113@udm.edu.ph", "program": "BSED - General Science"},
  {"studentNo": "23-20-130", "studentName": "BEATRICE ANNE C. PASCUAL", "email": "beatrice.pascual_130@udm.edu.ph", "program": "BSED - Physical Education"},
  {"studentNo": "23-20-125", "studentName": "CHRISTOPHER JOHN C. PASCUAL", "email": "christopher.pascual_125@udm.edu.ph", "program": "BSED - General Science"},
  {"studentNo": "23-20-114", "studentName": "JOAQUIN L. PELAYO", "email": "joaquin.pelayo_114@udm.edu.ph", "program": "BSED - Physical Education"},
  {"studentNo": "23-20-275", "studentName": "TRISTAN DAVE M. PINEDA", "email": "tristan.pineda_275@udm.edu.ph", "program": "BSED - Physical Education"},
  {"studentNo": "23-20-127", "studentName": "CARMELA JANE M. QUIAMBAO", "email": "carmela.quiambao_127@udm.edu.ph", "program": "BSED - Social Studies"},
  {"studentNo": "23-20-163", "studentName": "CEDRIC JOHN M. RAMIREZ", "email": "cedric.ramirez_163@udm.edu.ph", "program": "BSED - General Science"},
  {"studentNo": "23-20-233", "studentName": "DANIEL MARCO T. RAMOS", "email": "daniel.ramos_233@udm.edu.ph", "program": "BSED - English"},
  {"studentNo": "23-20-241", "studentName": "ELLA MAE M. RAMOS", "email": "ella.ramos_241@udm.edu.ph", "program": "BSED - Physical Education"},
  {"studentNo": "23-20-229", "studentName": "JONATHAN D. RAMOS", "email": "jonathan.ramos_229@udm.edu.ph", "program": "BSED - General Science"},
  {"studentNo": "23-20-173", "studentName": "KATRINA BIANCA P. RAMOS", "email": "katrina.ramos_173@udm.edu.ph", "program": "BSED - Social Studies"},
  {"studentNo": "23-20-121", "studentName": "MARIA CIELO P. RAMOS", "email": "maria.ramos_121@udm.edu.ph", "program": "BSED - Physical Education"},
  {"studentNo": "23-20-124", "studentName": "SAMANTHA R. RAÑOLA", "email": "samantha.raola_124@udm.edu.ph", "program": "BSED - English"},
  {"studentNo": "23-20-126", "studentName": "ALVIN JERICHO H. ROSALES", "email": "alvin.rosales_126@udm.edu.ph", "program": "BSED - Physical Education"},
  {"studentNo": "23-20-231", "studentName": "JOHN GABRIEL R. ROXAS", "email": "john.roxas_231@udm.edu.ph", "program": "BSED - Physical Education"},
  {"studentNo": "23-20-210", "studentName": "MIKAELLA JOY S. SALAZAR", "email": "mikaella.salazar_210@udm.edu.ph", "program": "BSED - Social Studies"},
  {"studentNo": "23-20-265", "studentName": "ALTHEA JOYCE P. SALGADO", "email": "althea.salgado_265@udm.edu.ph", "program": "BSED - Physical Education"},
  {"studentNo": "23-20-198", "studentName": "ALEXANDRA JANE P. SANCHEZ", "email": "alexandra.sanchez_198@udm.edu.ph", "program": "BSED - Social Studies"},
  {"studentNo": "23-20-172", "studentName": "ARIANNE MAE M. SANTOS", "email": "arianne.santos_172@udm.edu.ph", "program": "BSED - Mathematics"},
  {"studentNo": "23-20-138", "studentName": "BEATRICE NICOLE S. SANTOS", "email": "beatrice.santos_138@udm.edu.ph", "program": "BSED - General Science"},
  {"studentNo": "23-20-288", "studentName": "GABRIEL JOSHUA T. SANTOS", "email": "gabriel.santos_288@udm.edu.ph", "program": "BSED - General Science"},
  {"studentNo": "23-20-118", "studentName": "PATRICIA MAE M. SANTOS", "email": "patricia.santos_118@udm.edu.ph", "program": "BSED - Social Studies"},
  {"studentNo": "23-20-284", "studentName": "PATRICIA NICOLE R. SANTOS", "email": "patricia.santos_284@udm.edu.ph", "program": "BSED - Mathematics"},
  {"studentNo": "23-20-219", "studentName": "TRISTAN JOSHUA D. SANTOS", "email": "tristan.santos_219@udm.edu.ph", "program": "BSED - English"},
  {"studentNo": "23-20-122", "studentName": "AARON PAUL E. SEVILLA", "email": "aaron.sevilla_122@udm.edu.ph", "program": "BSED - General Science"},
  {"studentNo": "23-20-186", "studentName": "LANCE GABRIEL R. SILVA", "email": "lance.silva_186@udm.edu.ph", "program": "BSED - Physical Education"},
  {"studentNo": "23-20-243", "studentName": "MARIA ISABELLA V. SOLIS", "email": "maria.solis_243@udm.edu.ph", "program": "BSED - English"},
  {"studentNo": "23-20-154", "studentName": "ALTHEA KATHLEEN L. SORIANO", "email": "althea.soriano_154@udm.edu.ph", "program": "BSED - Mathematics"},
  {"studentNo": "23-20-237", "studentName": "NATHANIEL JOHN E. STA. MARIA", "email": "nathaniel.stamaria_237@udm.edu.ph", "program": "BSED - Physical Education"},
  {"studentNo": "23-20-250", "studentName": "CHRISTIAN DAVE N. TABLADA", "email": "christian.tablada_250@udm.edu.ph", "program": "BSED - General Science"},
  {"studentNo": "23-20-166", "studentName": "DANIEL JOSEPH T. TAN", "email": "daniel.tan_166@udm.edu.ph", "program": "BSED - English"},
  {"studentNo": "23-20-298", "studentName": "JASPER ALLEN R. TANGCO", "email": "jasper.tangco_298@udm.edu.ph", "program": "BSED - Mathematics"},
  {"studentNo": "23-20-181", "studentName": "MIGUEL ANTONIO S. TAYAG", "email": "miguel.tayag_181@udm.edu.ph", "program": "BSED - Social Studies"},
  {"studentNo": "23-20-157", "studentName": "CARLO S. VALDEZ", "email": "carlo.valdez_157@udm.edu.ph", "program": "BSED - Social Studies"},
  {"studentNo": "23-20-208", "studentName": "SEAN GABRIEL D. VALENCIA", "email": "sean.valencia_208@udm.edu.ph", "program": "BSED - Social Studies"},
  {"studentNo": "23-20-187", "studentName": "ALEXIS JADE R. VALENZUELA", "email": "alexis.valenzuela_187@udm.edu.ph", "program": "BSED - Physical Education"},
  {"studentNo": "23-20-158", "studentName": "TRISTAN DAVE M. VEGA", "email": "tristan.vega_158@udm.edu.ph", "program": "BSED - General Science"},
  {"studentNo": "23-20-253", "studentName": "JARED V. VELASCO", "email": "jared.velasco_253@udm.edu.ph", "program": "BSED - English"},
  {"studentNo": "23-20-147", "studentName": "ARIANNE NICOLE S. VENTURA", "email": "arianne.ventura_147@udm.edu.ph", "program": "BSED - Physical Education"},
  {"studentNo": "23-20-131", "studentName": "CHRISTOPHER JOHN C. VERGARA", "email": "christopher.vergara_131@udm.edu.ph", "program": "BSED - Mathematics"},
  {"studentNo": "23-20-154", "studentName": "NATHAN XANDER S. VILLAFLOR", "email": "nathan.villaflor_154@udm.edu.ph", "program": "BSED - Social Studies"},
  {"studentNo": "23-20-223", "studentName": "NOEL T. VILLAMOR", "email": "noel.villamor_223@udm.edu.ph", "program": "BSED - Mathematics"},
  {"studentNo": "23-20-194", "studentName": "KIMBERLY ANN S. VILLANUEVA", "email": "kimberly.villanueva_194@udm.edu.ph", "program": "BSED - English"},
  {"studentNo": "23-20-171", "studentName": "MARCUS GABRIEL B. VILLAR", "email": "marcus.villar_171@udm.edu.ph", "program": "BSED - Social Studies"},
  {"studentNo": "23-20-167", "studentName": "ALEXA NICOLE C. VILLEGAS", "email": "alexa.villegas_167@udm.edu.ph", "program": "BSED - Mathematics"},
  {"studentNo": "23-20-204", "studentName": "CARMELA JANE M. YAMBAO", "email": "carmela.yambao_204@udm.edu.ph", "program": "BSED - General Science"}
];

async function seedDatabase() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log(" Connected to MongoDB Atlas for batch seeding...");

        let insertedCount = 0;
        let skippedCount = 0;

        for (const s of students) {
            // Check if user already exists
            const existing = await User.findOne({ email: s.email });
            if (!existing) {
                await User.create({
                    studentNo: s.studentNo,
                    email: s.email,
                    password: "UDM2026!",
                    role: "student"
                });
                insertedCount++;
            } else {
                skippedCount++;
            }
        }

        console.log(` Batch Seeding Complete!`);
        console.log(` Inserted: ${insertedCount} student accounts`);
        console.log(`  Skipped (Already exists): ${skippedCount}`);
        process.exit(0);
    } catch (err) {
        console.error("❌ Seeding Error:", err);
        process.exit(1);
    }
}

seedDatabase();