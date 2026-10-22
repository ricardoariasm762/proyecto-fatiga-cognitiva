/**
 * Modelo de datos de los ejercicios y preguntas de programación/computación.
 */

export interface ExerciseQuestion {
  id: number;
  category: string;
  difficulty: 'Básico' | 'Intermedio' | 'Avanzado';
  title: string;
  description: string;
  codeSnippet?: string;
  codeLanguage?: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

export const DEFAULT_QUESTIONS: ExerciseQuestion[] = [
  {
    id: 1,
    category: 'Algoritmos y Complejidad',
    difficulty: 'Básico',
    title: 'Búsqueda Binaria sobre Arreglos Ordenados',
    description: 'Analiza el siguiente algoritmo de búsqueda binaria. ¿Cuál es su complejidad temporal en el peor de los casos para una entrada de tamaño N?',
    codeSnippet: `function binarySearch(arr: number[], target: number): number {
  let left = 0, right = arr.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}`,
    codeLanguage: 'typescript',
    options: [
      'O(1) - Constante en todo escenario',
      'O(log N) - Logarítmica por división sucesiva del espacio de búsqueda',
      'O(N) - Lineal proporcional al número de elementos',
      'O(N log N) - Cuasi-lineal debido a la comparación de mitades'
    ],
    correctOptionIndex: 1,
    explanation: 'La búsqueda binaria descarta la mitad del arreglo en cada iteración, logrando una complejidad logarítmica O(log N).'
  },
  {
    id: 2,
    category: 'TypeScript & Programación Reactiva',
    difficulty: 'Intermedio',
    title: 'Type Narrowing mediante Discriminated Unions',
    description: 'Dado el tipo unión discriminada y la función guard, ¿qué tipo infiere TypeScript dentro del bloque condicional?',
    codeSnippet: `type NetworkState = 
  | { state: 'loading' }
  | { state: 'success'; data: string[] }
  | { state: 'error'; message: string };

function handleResponse(response: NetworkState) {
  if (response.state === 'success') {
    console.log(response.data);
  }
}`,
    codeLanguage: 'typescript',
    options: [
      'Cualquier propiedad de cualquier variante (tipo Any flexible)',
      'Exclusivamente { state: "success"; data: string[] } gracias al discriminador literal',
      'Un error de compilación porque la unión no tiene interfaz común',
      'El tipo permanece como NetworkState completo requiriendo casteo as'
    ],
    correctOptionIndex: 1,
    explanation: 'TypeScript estrecha el tipo automáticamente analizando el discriminador literal común "state".'
  },
  {
    id: 3,
    category: 'Estructuras de Datos',
    difficulty: 'Intermedio',
    title: 'Resolución de Colisiones en Hash Tables',
    description: 'En una tabla Hash implementada con Direccionamiento Abierto (Linear Probing), ¿cuál es el fenómeno principal que degrada el rendimiento?',
    options: [
      'Fuga de memoria por apuntadores circulares huérfanos',
      'Agrupamiento Primario (Primary Clustering), donde colisiones contiguas forman bloques largos',
      'Desbordamiento de pila por llamadas recursivas de dispersión',
      'Fragmentación de heap por asignación de nodos enlazados'
    ],
    correctOptionIndex: 1,
    explanation: 'El linear probing provoca que los elementos colisionados se acumulen en posiciones consecutivas, incrementando colisiones futuras.'
  },
  {
    id: 4,
    category: 'JavaScript & Event Loop',
    difficulty: 'Avanzado',
    title: 'Microtasks vs Macrotasks en el Runtime de JS',
    description: 'Determina el orden exacto de impresión en consola de este fragmento que combina promesas y temporizadores:',
    codeSnippet: `console.log('1');

setTimeout(() => {
  console.log('2');
}, 0);

Promise.resolve().then(() => {
  console.log('3');
});

console.log('4');`,
    codeLanguage: 'javascript',
    options: [
      '1, 2, 3, 4',
      '1, 4, 2, 3',
      '1, 4, 3, 2',
      '3, 1, 4, 2'
    ],
    correctOptionIndex: 2,
    explanation: 'El código síncrono imprime 1 y 4. Antes del macrotask (setTimeout), el Event Loop vacía la cola de microtasks imprimiendo 3, y finalmente 2.'
  },
  {
    id: 5,
    category: 'Arquitectura de Software',
    difficulty: 'Intermedio',
    title: 'Principios SOLID: Sustitución de Liskov (LSP)',
    description: '¿Cuál de las siguientes afirmaciones describe con mayor precisión el Principio de Sustitución de Liskov?',
    options: [
      'Las clases derivadas deben poder reemplazar a sus clases base sin alterar la correctitud del programa',
      'Una clase debe tener una sola razón para cambiar',
      'Las entidades deben estar abiertas a la modificación y cerradas a la extensión',
      'Los clientes no deben depender de métodos que no utilizan'
    ],
    correctOptionIndex: 0,
    explanation: 'LSP establece que los subtipos deben mantener el comportamiento esperado de sus tipos base sin romper contratos.'
  },
  {
    id: 6,
    category: 'Concurrencia y Sistemas Operativos',
    difficulty: 'Avanzado',
    title: 'Condiciones de Coffman para Deadlocks',
    description: 'Para que ocurra un interbloqueo permanente (Deadlock) en un entorno multi-hilo, deben cumplirse simultáneamente 4 condiciones de Coffman. ¿Cuál NO es una de ellas?',
    options: [
      'Exclusión Mutua (Mutual Exclusion)',
      'Retención y Espera (Hold and Wait)',
      'Apropiación Forzosa de Recursos (Resource Preemption Activa)',
      'Espera Circular (Circular Wait)'
    ],
    correctOptionIndex: 2,
    explanation: 'La condición de Coffman es "No Apropiación". La apropiación forzosa liberaría recursos evitando el deadlock.'
  },
  {
    id: 7,
    category: 'Bases de Datos & Optimización',
    difficulty: 'Intermedio',
    title: 'Índices B-Tree vs Full Table Scan',
    description: '¿Por qué un índice basado en B-Tree permite búsquedas de rango (WHERE edad BETWEEN 20 AND 30) de forma significativamente más eficiente que un Hash Index?',
    options: [
      'Porque los Hash Indexes no pueden almacenar números enteros',
      'Porque los nodos hoja del B-Tree están ordenados secuencialmente y doblemente enlazados',
      'Porque el B-Tree ejecuta paralelismo en GPU para consultas de rango',
      'Porque el Hash Index requiere re-indexar toda la tabla en cada consulta'
    ],
    correctOptionIndex: 1,
    explanation: 'Las hojas del B-Tree forman una lista enlazada ordenada que permite recorrer intervalos continuos eficientemente tras ubicar el punto inicial.'
  },
  {
    id: 8,
    category: 'Gestión de Memoria & Frameworks',
    difficulty: 'Avanzado',
    title: 'Prevención de Memory Leaks en Aplicaciones SPA',
    description: 'En Angular moderno, ¿cuál es el mecanismo recomendado y automático para cancelar suscripciones observables al destruir el contexto?',
    codeSnippet: `@Component({ ... })
export class DataViewer {
  private service = inject(DataService);
  
  private data$ = this.service.getData().pipe(
    takeUntilDestroyed()
  );
}`,
    codeLanguage: 'typescript',
    options: [
      'Llamar manualmente a window.gc() en el evento unmount',
      'El operador takeUntilDestroyed() vinculado al DestroyRef actual',
      'Asignar null a la variable en el constructor de la clase',
      'Utilizar exclusivamente promesas nativas en lugar de RxJS'
    ],
    correctOptionIndex: 1,
    explanation: 'takeUntilDestroyed() aprovecha el DestroyRef inyectado para completar la suscripción automáticamente al destruirse el componente.'
  }
];
