import * as vscode from 'vscode';
import * as YAML from 'yaml';

// Definizione dell'interfaccia per Swagger
interface SwaggerProperty {
	type: string;
	properties?: Record<string, SwaggerProperty>;
	items?: SwaggerProperty;
}

// Funzione per generare proprietà YAML Swagger da un oggetto
function generateSwaggerYamlProperties(object: Record<string, any>): string {
	const getType = (value: any): string => {
		if (value === null) return 'null'; // Gestisce il caso null esplicitamente
		if (Array.isArray(value)) return 'array';
		if (typeof value === 'object') return 'object';
		return typeof value;
	};

	const generateSchema = (obj: Record<string, any>): Record<string, SwaggerProperty> => {
		const properties: Record<string, SwaggerProperty> = {};

		for (const [key, value] of Object.entries(obj)) {
			const type = getType(value);

			if (type === 'object' && value !== null) {
				properties[key] = { type: 'object', properties: generateSchema(value) };
			} else if (type === 'array') {
				properties[key] = {
					type: 'array',
					items: value.length ? { type: getType(value[0]) } : { type: 'string' }
				};
			} else {
				properties[key] = { type };
			}
		}

		return properties;
	};

	const schemaProperties = generateSchema(object);

	// Genera il YAML e poi sostituisce il tipo "null" con il vero tipo YAML null
	const yaml = YAML.stringify({ properties: schemaProperties });

	// Rimuove le virgolette dalla parola chiave "null" nel YAML
	return yaml.replace(/"null"/g, 'null');
}

export function activate(context: vscode.ExtensionContext) {
	console.log('La tua estensione è ora attiva!');

	// Comando per aprire un editor JSON
	let openJsonEditorCommand = vscode.commands.registerCommand('estensione.openJsonEditor', async () => {
		// Crea un nuovo documento vuoto in modalità "untitled"
		const document = await vscode.workspace.openTextDocument({ language: 'json' });
		vscode.window.showTextDocument(document);
	});

	// Comando per processare il JSON e generare lo YAML Swagger
	let processJsonCommand = vscode.commands.registerCommand('estensione.processJson', async () => {
		const activeEditor = vscode.window.activeTextEditor;

		if (activeEditor) {
			const text = activeEditor.document.getText();

			try {
				// Analizza l'input JSON
				const inputObject = JSON.parse(text);
				const yamlOutput = generateSwaggerYamlProperties(inputObject);

				// Crea un nuovo documento per visualizzare l'output YAML
				const yamlDocument = await vscode.workspace.openTextDocument({
					content: yamlOutput,
					language: 'yaml'
				});
				vscode.window.showTextDocument(yamlDocument);

				vscode.window.showInformationMessage('Schema YAML generato con successo!');
			} catch (error) {
				vscode.window.showErrorMessage('Errore: Input JSON non valido');
			}
		} else {
			vscode.window.showErrorMessage('Nessun editor attivo trovato!');
		}
	});

	context.subscriptions.push(openJsonEditorCommand, processJsonCommand);
}

export function deactivate() { }
